/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 1st September 2026 3:31:00 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { emptyDir, FsNode, normalizeFsPath, sortFsNode } from "../types";

const TYPE_NAME_REG = 0x001;
const TYPE_NAME_DIR = 0x002;
const TYPE_SUPERBLOCK = 0x0ff;
const TYPE_DIRSTRUCT = 0x200;
const TYPE_INLINESTRUCT = 0x201;
const TYPE_CTZSTRUCT = 0x202;
const TYPE_CREATE = 0x401;
const TYPE_DELETE = 0x4ff;
const TYPE_HARDTAIL = 0x601;
const TYPE1_CRC = 0x500;

const TAG_VALID_MASK = 0x80000000;
const TAG_TYPE_MASK = 0x7ff00000;
const TAG_CHUNK_MASK = 0x0ff00000;
const TAG_ID_MASK = 0x000ffc00;
const TAG_SIZE_MASK = 0x000003ff;
const TAG_SIZE_DELETE = 0x3ff;

const DEFAULT_BLOCK_SIZE = 4096;
const MAX_TAGS_PER_BLOCK = 4096;
const MAX_MDIR_CHAIN = 512;
const MAX_DIR_DEPTH = 32;
const LITTLEFS_NAME = Buffer.from("littlefs");

export interface LfsTag {
  type: number;
  id: number;
  size: number;
  isDelete: boolean;
  data: Buffer;
}

export interface LfsMetadataBlock {
  revision: number;
  tags: LfsTag[];
}

/**
 * Metadata tags are stored big-endian, packed without alignment, and each tag
 * is XORed with the preceding one so an unwritten tag reads back as invalid.
 */
export function parseMetadataBlock(
  block: Buffer
): LfsMetadataBlock | undefined {
  if (block.length < 8) {
    return undefined;
  }
  const revision = block.readUInt32LE(0);
  const tags: LfsTag[] = [];
  let previousTag = 0xffffffff;
  let offset = 4;
  while (offset + 4 <= block.length && tags.length < MAX_TAGS_PER_BLOCK) {
    const tag = (block.readUInt32BE(offset) ^ previousTag) >>> 0;
    if (tag & TAG_VALID_MASK) {
      break;
    }
    const type = (tag & TAG_TYPE_MASK) >>> 20;
    const id = (tag & TAG_ID_MASK) >>> 10;
    const rawSize = tag & TAG_SIZE_MASK;
    const isDelete = rawSize === TAG_SIZE_DELETE;
    const size = isDelete ? 0 : rawSize;
    if (offset + 4 + size > block.length) {
      break;
    }
    tags.push({
      type,
      id,
      size,
      isDelete,
      data: block.subarray(offset + 4, offset + 4 + size),
    });
    previousTag = tag;
    if ((type & 0x700) === TYPE1_CRC) {
      const chunk = (tag & TAG_CHUNK_MASK) >>> 20;
      previousTag = (previousTag ^ ((chunk & 1) << 31)) >>> 0;
    }
    offset += 4 + size;
  }
  return tags.length > 0 ? { revision, tags } : undefined;
}

export function listLittlefs(data: Buffer): FsNode {
  const root = emptyDir("/", "/");
  const superblock = readLittlefsSuperblock(data);
  const blockSize = superblock?.blockSize ?? inferBlockSize(data);
  if (!blockSize) {
    root.error = "Could not infer LittleFS block size from the image.";
    return root;
  }

  const visited = new Set<string>();
  buildDirectory(data, blockSize, [0, 1], root, 0, visited);
  if (root.children && root.children.length > 0) {
    sortFsNode(root);
    return root;
  }

  const scanned = scanAllBlocks(data, blockSize, root);
  if (!scanned) {
    root.error = "No LittleFS directory entries were found.";
  }
  sortFsNode(root);
  return root;
}

interface LfsEntry {
  name?: string;
  isDir?: boolean;
  size?: number;
  pair?: [number, number];
  isSuperblock?: boolean;
  inlineData?: Buffer;
  ctzHead?: number;
}

function buildDirectory(
  data: Buffer,
  blockSize: number,
  pair: [number, number],
  parent: FsNode,
  depth: number,
  visited: Set<string>
): void {
  if (depth > MAX_DIR_DEPTH) {
    return;
  }
  for (const entry of readDirectoryEntries(data, blockSize, pair, visited)) {
    if (!entry.name || entry.isSuperblock) {
      continue;
    }
    const path =
      parent.path === "/" ? `/${entry.name}` : `${parent.path}/${entry.name}`;
    if (entry.isDir) {
      const dirNode: FsNode = {
        name: entry.name,
        path,
        isDir: true,
        children: [],
      };
      parent.children!.push(dirNode);
      if (entry.pair) {
        buildDirectory(
          data,
          blockSize,
          entry.pair,
          dirNode,
          depth + 1,
          visited
        );
      }
    } else {
      parent.children!.push({
        name: entry.name,
        path,
        isDir: false,
        size: entry.size,
      });
    }
  }
}

/**
 * A directory spans a chain of metadata pairs linked by hard tails. Soft tails
 * point at unrelated directories and must not be followed here.
 */
function readDirectoryEntries(
  data: Buffer,
  blockSize: number,
  pair: [number, number],
  visited: Set<string>
): LfsEntry[] {
  const entries: LfsEntry[] = [];
  let current: [number, number] | undefined = pair;
  for (let i = 0; i < MAX_MDIR_CHAIN && current; i++) {
    const key = `${current[0]},${current[1]}`;
    if (visited.has(key)) {
      break;
    }
    visited.add(key);
    const mdir = fetchMetadataPair(data, blockSize, current);
    if (!mdir) {
      break;
    }
    entries.push(...applyTags(mdir.tags));
    current = findHardTail(mdir.tags);
  }
  return entries;
}

function fetchMetadataPair(
  data: Buffer,
  blockSize: number,
  pair: [number, number]
): LfsMetadataBlock | undefined {
  let newest: LfsMetadataBlock | undefined;
  for (const blockIndex of pair) {
    const parsed = parseBlockAt(data, blockSize, blockIndex);
    if (!parsed) {
      continue;
    }
    if (!newest || isNewerRevision(parsed.revision, newest.revision)) {
      newest = parsed;
    }
  }
  return newest;
}

function parseBlockAt(
  data: Buffer,
  blockSize: number,
  blockIndex: number
): LfsMetadataBlock | undefined {
  const start = blockIndex * blockSize;
  if (blockIndex < 0 || start + blockSize > data.length) {
    return undefined;
  }
  return parseMetadataBlock(data.subarray(start, start + blockSize));
}

function isNewerRevision(candidate: number, current: number): boolean {
  return ((candidate - current) | 0) > 0;
}

function applyTags(tags: LfsTag[]): LfsEntry[] {
  const entries: LfsEntry[] = [];
  const entryAt = (id: number): LfsEntry => {
    while (entries.length <= id) {
      entries.push({});
    }
    return entries[id];
  };

  for (const tag of tags) {
    switch (tag.type) {
      case TYPE_CREATE:
        entries.splice(Math.min(tag.id, entries.length), 0, {});
        break;
      case TYPE_DELETE:
        if (tag.id < entries.length) {
          entries.splice(tag.id, 1);
        }
        break;
      case TYPE_SUPERBLOCK: {
        const entry = entryAt(tag.id);
        entry.isSuperblock = true;
        entry.inlineData = undefined;
        entry.ctzHead = undefined;
        break;
      }
      case TYPE_NAME_REG:
      case TYPE_NAME_DIR: {
        const name = decodeName(tag.data);
        if (!name) {
          break;
        }
        const entry = entryAt(tag.id);
        entry.name = name;
        entry.isDir = tag.type === TYPE_NAME_DIR;
        break;
      }
      case TYPE_INLINESTRUCT: {
        const entry = entryAt(tag.id);
        if (!entry.isSuperblock) {
          entry.size = tag.size;
          entry.inlineData = Buffer.from(tag.data);
          entry.ctzHead = undefined;
        }
        break;
      }
      case TYPE_CTZSTRUCT: {
        if (tag.size >= 8) {
          const entry = entryAt(tag.id);
          entry.size = tag.data.readUInt32LE(4);
          entry.ctzHead = tag.data.readUInt32LE(0);
          entry.inlineData = undefined;
        }
        break;
      }
      case TYPE_DIRSTRUCT: {
        if (tag.size >= 8) {
          entryAt(tag.id).pair = [
            tag.data.readUInt32LE(0),
            tag.data.readUInt32LE(4),
          ];
        }
        break;
      }
      default:
        break;
    }
  }
  return entries;
}

function findHardTail(tags: LfsTag[]): [number, number] | undefined {
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    if (tag.type === TYPE_HARDTAIL && tag.size >= 8) {
      return [tag.data.readUInt32LE(0), tag.data.readUInt32LE(4)];
    }
  }
  return undefined;
}

/**
 * The superblock name tag and its inline config live at the very start of the
 * root metadata pair, so this also rules out app images that merely embed the
 * "littlefs" string somewhere in their code.
 */
export function readLittlefsSuperblock(
  data: Buffer
): { blockSize: number; blockCount: number } | undefined {
  for (const blockIndex of [0, 1]) {
    const window = data.subarray(
      blockIndex * DEFAULT_BLOCK_SIZE,
      blockIndex * DEFAULT_BLOCK_SIZE + Math.min(data.length, 64 * 1024)
    );
    const parsed = parseMetadataBlock(window);
    if (!parsed) {
      continue;
    }
    let sawName = false;
    for (const tag of parsed.tags) {
      if (tag.type === TYPE_SUPERBLOCK && tag.data.equals(LITTLEFS_NAME)) {
        sawName = true;
        continue;
      }
      if (sawName && tag.type === TYPE_INLINESTRUCT && tag.size >= 12) {
        const blockSize = tag.data.readUInt32LE(4);
        const blockCount = tag.data.readUInt32LE(8);
        if (isPlausibleBlockSize(blockSize, data.length)) {
          return { blockSize, blockCount };
        }
      }
    }
  }
  return undefined;
}

function scanAllBlocks(data: Buffer, blockSize: number, root: FsNode): boolean {
  const found = new Map<string, { isDir: boolean; size?: number }>();
  const blockCount = Math.floor(data.length / blockSize);
  for (let i = 0; i < blockCount; i++) {
    const parsed = parseBlockAt(data, blockSize, i);
    if (!parsed) {
      continue;
    }
    for (const entry of applyTags(parsed.tags)) {
      if (!entry.name || entry.isSuperblock) {
        continue;
      }
      found.set(entry.name, { isDir: !!entry.isDir, size: entry.size });
    }
  }
  for (const [name, info] of found) {
    root.children!.push({
      name,
      path: `/${name}`,
      isDir: info.isDir,
      size: info.size,
      children: info.isDir ? [] : undefined,
    });
  }
  return found.size > 0;
}

function inferBlockSize(data: Buffer): number | undefined {
  for (const candidate of [4096, 8192, 2048, 1024, 512, 256, 16384, 32768]) {
    if (data.length >= candidate && data.length % candidate === 0) {
      return candidate;
    }
  }
  return data.length >= DEFAULT_BLOCK_SIZE ? DEFAULT_BLOCK_SIZE : undefined;
}

function isPlausibleBlockSize(size: number, imageLength: number): boolean {
  return size >= 128 && size <= 65536 && imageLength % size === 0;
}

export function readLittlefsFile(
  data: Buffer,
  virtualPath: string
): Buffer | undefined {
  const superblock = readLittlefsSuperblock(data);
  const blockSize = superblock?.blockSize ?? inferBlockSize(data);
  if (!blockSize) {
    return undefined;
  }
  const target = normalizeFsPath(virtualPath);
  const sawEntry = { found: false };
  const entry = findInDirectory(
    data,
    blockSize,
    [0, 1],
    "/",
    target,
    0,
    new Set<string>(),
    sawEntry
  );
  if (entry) {
    return materializeLittlefsFile(data, blockSize, entry);
  }
  if (sawEntry.found) {
    return undefined;
  }
  return materializeLittlefsFile(
    data,
    blockSize,
    findInScan(data, blockSize, target)
  );
}

function findInDirectory(
  data: Buffer,
  blockSize: number,
  pair: [number, number],
  parentPath: string,
  target: string,
  depth: number,
  visited: Set<string>,
  sawEntry: { found: boolean }
): LfsEntry | undefined {
  if (depth > MAX_DIR_DEPTH) {
    return undefined;
  }
  for (const entry of readDirectoryEntries(data, blockSize, pair, visited)) {
    if (!entry.name || entry.isSuperblock) {
      continue;
    }
    sawEntry.found = true;
    const path =
      parentPath === "/" ? `/${entry.name}` : `${parentPath}/${entry.name}`;
    if (!entry.isDir && path === target) {
      return entry;
    }
    if (
      entry.isDir &&
      entry.pair &&
      (target === path || target.startsWith(`${path}/`))
    ) {
      const nested = findInDirectory(
        data,
        blockSize,
        entry.pair,
        path,
        target,
        depth + 1,
        visited,
        sawEntry
      );
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function findInScan(
  data: Buffer,
  blockSize: number,
  target: string
): LfsEntry | undefined {
  let match: LfsEntry | undefined;
  const blockCount = Math.floor(data.length / blockSize);
  for (let i = 0; i < blockCount; i++) {
    const parsed = parseBlockAt(data, blockSize, i);
    if (!parsed) {
      continue;
    }
    for (const entry of applyTags(parsed.tags)) {
      if (!entry.name || entry.isSuperblock || entry.isDir) {
        continue;
      }
      if (normalizeFsPath(`/${entry.name}`) === target) {
        match = entry;
      }
    }
  }
  return match;
}

function materializeLittlefsFile(
  data: Buffer,
  blockSize: number,
  entry: LfsEntry | undefined
): Buffer | undefined {
  if (!entry || entry.isDir) {
    return undefined;
  }
  if (entry.inlineData) {
    const size = entry.size ?? entry.inlineData.length;
    return Buffer.from(entry.inlineData.subarray(0, size));
  }
  if (entry.ctzHead !== undefined && entry.size !== undefined) {
    return readCtz(data, blockSize, entry.ctzHead, entry.size);
  }
  if (entry.size === 0) {
    return Buffer.alloc(0);
  }
  return undefined;
}

/**
 * LittleFS stores large files as a reverse skip-list. The block index for a
 * file offset, and the pointer walk back to that block, follow lfs_ctz_find.
 */
function readCtz(
  data: Buffer,
  blockSize: number,
  head: number,
  size: number
): Buffer | undefined {
  if (size === 0) {
    return Buffer.alloc(0);
  }
  if (head === 0xffffffff) {
    return undefined;
  }
  const out = Buffer.alloc(size);
  let pos = 0;
  while (pos < size) {
    const located = ctzFind(data, blockSize, head, size, pos);
    if (!located) {
      return undefined;
    }
    const available = blockSize - located.offset;
    if (available <= 0) {
      return undefined;
    }
    const n = Math.min(size - pos, available);
    const start = located.block * blockSize + located.offset;
    if (located.block < 0 || start + n > data.length) {
      return undefined;
    }
    data.copy(out, pos, start, start + n);
    pos += n;
  }
  return out;
}

function ctzFind(
  data: Buffer,
  blockSize: number,
  head: number,
  size: number,
  position: number
): { block: number; offset: number } | undefined {
  const end = ctzIndex(blockSize, size - 1);
  const target = ctzIndex(blockSize, position);
  if (!end || !target) {
    return undefined;
  }
  let current = end.index;
  let block = head;
  while (current > target.index) {
    const skip = Math.min(
      npw2(current - target.index + 1) - 1,
      countTrailingZeros(current)
    );
    const pointerAt = block * blockSize + 4 * skip;
    if (skip < 0 || pointerAt < 0 || pointerAt + 4 > data.length) {
      return undefined;
    }
    block = data.readUInt32LE(pointerAt);
    current -= 1 << skip;
  }
  return { block, offset: target.offset };
}

function ctzIndex(
  blockSize: number,
  offset: number
): { index: number; offset: number } | undefined {
  const stride = blockSize - 8;
  if (stride <= 0 || offset < 0) {
    return undefined;
  }
  let index = Math.floor(offset / stride);
  if (index === 0) {
    return { index: 0, offset };
  }
  index = Math.floor((offset - 4 * (popcount(index - 1) + 2)) / stride);
  const inBlock = offset - stride * index - 4 * popcount(index);
  if (index < 0 || inBlock < 0 || inBlock >= blockSize) {
    return undefined;
  }
  return { index, offset: inBlock };
}

function popcount(value: number): number {
  let count = 0;
  let bits = value >>> 0;
  while (bits) {
    count += bits & 1;
    bits >>>= 1;
  }
  return count;
}

function countTrailingZeros(value: number): number {
  const bits = value >>> 0;
  if (bits === 0) {
    return 32;
  }
  let count = 0;
  let rest = bits;
  while ((rest & 1) === 0) {
    rest >>>= 1;
    count++;
  }
  return count;
}

function npw2(value: number): number {
  return 32 - Math.clz32((value - 1) >>> 0);
}

function decodeName(data: Buffer): string | undefined {
  if (data.length === 0) {
    return undefined;
  }
  const text = data.toString("utf8");
  if (/[\x00-\x1f\x7f]/.test(text)) {
    return undefined;
  }
  return text;
}
