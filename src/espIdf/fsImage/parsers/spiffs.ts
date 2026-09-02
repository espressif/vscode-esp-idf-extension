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

import {
  addChildPath,
  emptyDir,
  FsNode,
  readFlashCString,
  sortFsNode,
} from "../types";

export const SPIFFS_MAGIC_BASE = 0x20140529;

const PAGE_SIZE_CANDIDATES = [256, 512, 1024, 128];
const BLOCK_SIZE_CANDIDATES = [4096, 8192, 16384, 32768, 65536];
const DEFAULT_PAGE_SIZE = 256;

/** Page header flags are active low: flash erases to 1, SPIFFS clears bits. */
const FLAG_USED = 1 << 0;
const FLAG_INDEX = 1 << 2;
const FLAG_DELETED = 1 << 7;

const OBJ_ID_IX_FLAG = 0x8000;
const OBJ_ID_FREE = 0xffff;
const OBJ_ID_SIZE = 2;
const SIZE_OFFSET = 8;
const TYPE_OFFSET = 12;
const NAME_OFFSET = 13;
const NAME_MAX_LEN = 32;
const TYPE_FILE = 0x01;
const TYPE_DIR = 0x02;
const SIZE_UNDEFINED = 0xffffffff;

export interface SpiffsGeometry {
  pageSize: number;
  blockSize: number;
  blockCount: number;
}

export interface SpiffsObject {
  name: string;
  size?: number;
  isDir: boolean;
}

/**
 * Each block stores a magic value derived from the page size (and, when
 * SPIFFS_USE_MAGIC_LENGTH is enabled, the remaining block count) just before
 * the erase counter at the end of the first lookup page.
 */
export function findSpiffsGeometry(data: Buffer): SpiffsGeometry | undefined {
  for (const pageSize of PAGE_SIZE_CANDIDATES) {
    for (const blockSize of BLOCK_SIZE_CANDIDATES) {
      if (blockSize <= pageSize || data.length % blockSize !== 0) {
        continue;
      }
      const blockCount = data.length / blockSize;
      if (blockCount < 2) {
        continue;
      }
      if (magicMatches(data, pageSize, blockSize, blockCount, true)) {
        return { pageSize, blockSize, blockCount };
      }
      if (magicMatches(data, pageSize, blockSize, blockCount, false)) {
        return { pageSize, blockSize, blockCount };
      }
    }
  }
  return undefined;
}

function magicMatches(
  data: Buffer,
  pageSize: number,
  blockSize: number,
  blockCount: number,
  withLength: boolean
): boolean {
  for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
    const offset = blockIndex * blockSize + pageSize - OBJ_ID_SIZE * 2;
    if (offset + OBJ_ID_SIZE > data.length) {
      return false;
    }
    const expected = withLength
      ? (SPIFFS_MAGIC_BASE ^ pageSize ^ (blockCount - blockIndex)) & 0xffff
      : (SPIFFS_MAGIC_BASE ^ pageSize) & 0xffff;
    if (data.readUInt16LE(offset) !== expected) {
      return false;
    }
  }
  return true;
}

export function collectSpiffsObjects(
  data: Buffer,
  geometry?: SpiffsGeometry
): SpiffsObject[] {
  const pageSize = geometry?.pageSize ?? DEFAULT_PAGE_SIZE;
  const lookupPages = geometry ? countLookupPages(geometry) : 0;
  const pagesPerBlock = geometry ? geometry.blockSize / pageSize : 0;
  const objects: SpiffsObject[] = [];
  const pageCount = Math.floor(data.length / pageSize);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    if (pagesPerBlock && pageIndex % pagesPerBlock < lookupPages) {
      continue;
    }
    const page = data.subarray(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    const parsed = parseIndexHeader(page);
    if (parsed) {
      objects.push(parsed);
    }
  }
  return objects;
}

function countLookupPages(geometry: SpiffsGeometry): number {
  const pagesPerBlock = geometry.blockSize / geometry.pageSize;
  return Math.ceil((pagesPerBlock * OBJ_ID_SIZE) / geometry.pageSize);
}

export function parseIndexHeader(page: Buffer): SpiffsObject | undefined {
  if (page.length < NAME_OFFSET + 1) {
    return undefined;
  }
  const objId = page.readUInt16LE(0);
  const spanIndex = page.readUInt16LE(2);
  const flags = page[4];
  if (objId === OBJ_ID_FREE || (objId & OBJ_ID_IX_FLAG) === 0) {
    return undefined;
  }
  if (spanIndex !== 0) {
    return undefined;
  }
  const isUsed = (flags & FLAG_USED) === 0;
  const isIndexPage = (flags & FLAG_INDEX) === 0;
  const isDeleted = (flags & FLAG_DELETED) === 0;
  if (!isUsed || !isIndexPage || isDeleted) {
    return undefined;
  }
  const type = page[TYPE_OFFSET];
  if (type !== TYPE_FILE && type !== TYPE_DIR) {
    return undefined;
  }
  const rawSize = page.readUInt32LE(SIZE_OFFSET);
  const name = readFlashCString(
    page.subarray(NAME_OFFSET, NAME_OFFSET + NAME_MAX_LEN)
  );
  if (!name || /[\x00-\x1f\x7f]/.test(name)) {
    return undefined;
  }
  return {
    name,
    size: rawSize === SIZE_UNDEFINED ? undefined : rawSize,
    isDir: type === TYPE_DIR,
  };
}

export function listSpiffs(data: Buffer): FsNode {
  const root = emptyDir("/", "/");
  const geometry = findSpiffsGeometry(data);
  const objects = collectSpiffsObjects(data, geometry);

  if (objects.length === 0) {
    if (!geometry) {
      root.error = "No SPIFFS file index headers were found.";
    }
    return root;
  }

  for (const object of objects) {
    addChildPath(root, object.name, {
      size: object.size,
      isDir: object.isDir,
    });
  }
  sortFsNode(root);
  return root;
}
