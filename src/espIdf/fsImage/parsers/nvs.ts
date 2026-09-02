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

import { emptyDir, FsNode, readFlashCString, sortFsNode } from "../types";

const PAGE_SIZE = 4096;
const HEADER_SIZE = 32;
const BITMAP_SIZE = 32;
const ENTRY_SIZE = 32;
const ENTRY_COUNT = 126;
const KEY_MAX_LEN = 16;
const VALUE_PREVIEW_MAX = 48;

const STATE_UNINITIALIZED = 0xffffffff;
const STATE_INVALID = 0x00000000;
const PAGE_STATES = new Set([
  STATE_UNINITIALIZED,
  0xfffffffe, // active
  0xfffffffc, // full
  0xfffffff8, // freeing
]);
const VERSIONS = new Set([0xff, 0xfe]);

const ENTRY_STATE_WRITTEN = 0x2;
const NAMESPACE_INDEX = 0;
const CHUNK_ANY = 0xff;

const TYPE_U8 = 0x01;
const TYPE_SZ = 0x21;
const TYPE_BLOB = 0x41;
const TYPE_BLOB_DATA = 0x42;
const TYPE_BLOB_IDX = 0x48;

const ITEM_TYPES: Record<number, string> = {
  0x01: "u8",
  0x11: "i8",
  0x02: "u16",
  0x12: "i16",
  0x04: "u32",
  0x14: "i32",
  0x08: "u64",
  0x18: "i64",
  [TYPE_SZ]: "string",
  [TYPE_BLOB]: "blob",
  [TYPE_BLOB_DATA]: "blob",
  [TYPE_BLOB_IDX]: "blob",
};

export interface NvsItem {
  namespaceIndex: number;
  type: number;
  span: number;
  key: string;
  data: Buffer;
  /** Payload of multi-entry items (strings and blob chunks). */
  payload?: Buffer;
}

export function looksLikeNvsPage(data: Buffer, offset: number): boolean {
  if (offset + HEADER_SIZE > data.length) {
    return false;
  }
  const state = data.readUInt32LE(offset);
  const version = data[offset + 8];
  if (!PAGE_STATES.has(state) || !VERSIONS.has(version)) {
    return false;
  }
  return !(state === STATE_UNINITIALIZED && version === 0xff);
}

export function countNvsPages(data: Buffer): number {
  let pages = 0;
  const pageCount = Math.floor(data.length / PAGE_SIZE);
  for (let i = 0; i < pageCount; i++) {
    if (looksLikeNvsPage(data, i * PAGE_SIZE)) {
      pages++;
    }
  }
  return pages;
}

export function readNvsItems(
  data: Buffer
): { items: NvsItem[]; writtenEntries: number } {
  const items: NvsItem[] = [];
  let writtenEntries = 0;
  const pageCount = Math.floor(data.length / PAGE_SIZE);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageOffset = pageIndex * PAGE_SIZE;
    if (!looksLikeNvsPage(data, pageOffset)) {
      continue;
    }
    const state = data.readUInt32LE(pageOffset);
    if (state === STATE_UNINITIALIZED || state === STATE_INVALID) {
      continue;
    }
    const page = data.subarray(pageOffset, pageOffset + PAGE_SIZE);
    const bitmap = page.subarray(HEADER_SIZE, HEADER_SIZE + BITMAP_SIZE);
    const entriesStart = HEADER_SIZE + BITMAP_SIZE;

    for (let entryIndex = 0; entryIndex < ENTRY_COUNT; entryIndex++) {
      if (readEntryState(bitmap, entryIndex) !== ENTRY_STATE_WRITTEN) {
        continue;
      }
      writtenEntries++;
      const offset = entriesStart + entryIndex * ENTRY_SIZE;
      const item = parseItem(page, offset);
      if (!item) {
        continue;
      }
      const span = Math.max(1, Math.min(item.span, ENTRY_COUNT - entryIndex));
      if (span > 1) {
        item.payload = page.subarray(
          offset + ENTRY_SIZE,
          offset + span * ENTRY_SIZE
        );
      }
      items.push(item);
      // Continuation entries belong to this item, not to new keys.
      entryIndex += span - 1;
    }
  }
  return { items, writtenEntries };
}

export function listNvs(data: Buffer): FsNode {
  const root = emptyDir("/", "/");
  const { items, writtenEntries } = readNvsItems(data);

  if (writtenEntries > 0 && items.length === 0) {
    root.error = "NVS partition appears encrypted or unreadable.";
    return root;
  }

  const namespaces = new Map<number, string>();
  for (const item of items) {
    if (item.namespaceIndex === NAMESPACE_INDEX && item.type === TYPE_U8) {
      namespaces.set(item.data.readUInt8(0), item.key);
    }
  }

  const namespaceNodes = new Map<string, FsNode>();
  const namespaceNode = (name: string): FsNode => {
    let node = namespaceNodes.get(name);
    if (!node) {
      node = emptyDir(name, `/${name}`);
      namespaceNodes.set(name, node);
      root.children!.push(node);
    }
    return node;
  };

  for (const name of namespaces.values()) {
    namespaceNode(name);
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (item.namespaceIndex === NAMESPACE_INDEX) {
      continue;
    }
    if (item.type === TYPE_BLOB_DATA) {
      continue;
    }
    const nsName =
      namespaces.get(item.namespaceIndex) || `ns_${item.namespaceIndex}`;
    const dedupeKey = `${nsName}/${item.key}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    const node = namespaceNode(nsName);
    node.children!.push({
      name: item.key,
      path: `/${nsName}/${item.key}`,
      isDir: false,
      nvsType: ITEM_TYPES[item.type] || `0x${item.type.toString(16)}`,
      nvsValuePreview: formatValue(item),
    });
  }

  if (root.children!.length === 0) {
    root.error = "No NVS entries were found.";
  }
  sortFsNode(root);
  return root;
}

function parseItem(page: Buffer, offset: number): NvsItem | undefined {
  if (offset + ENTRY_SIZE > page.length) {
    return undefined;
  }
  const namespaceIndex = page[offset];
  const type = page[offset + 1];
  const span = page[offset + 2];
  const key = readFlashCString(
    page.subarray(offset + 8, offset + 8 + KEY_MAX_LEN)
  );
  if (!key || !/^[\x20-\x7e]+$/.test(key)) {
    return undefined;
  }
  return {
    namespaceIndex,
    type,
    span,
    key,
    data: page.subarray(offset + 24, offset + ENTRY_SIZE),
  };
}

function readEntryState(bitmap: Buffer, index: number): number {
  const bitOffset = index * 2;
  const byteOffset = bitOffset >> 3;
  const shift = bitOffset % 8;
  return (bitmap[byteOffset] >> shift) & 0x03;
}

function formatValue(item: NvsItem): string {
  const typeName = ITEM_TYPES[item.type];
  try {
    switch (item.type) {
      case 0x01:
        return String(item.data.readUInt8(0));
      case 0x11:
        return String(item.data.readInt8(0));
      case 0x02:
        return String(item.data.readUInt16LE(0));
      case 0x12:
        return String(item.data.readInt16LE(0));
      case 0x04:
        return String(item.data.readUInt32LE(0));
      case 0x14:
        return String(item.data.readInt32LE(0));
      case 0x08:
        return item.data.readBigUInt64LE(0).toString();
      case 0x18:
        return item.data.readBigInt64LE(0).toString();
      case TYPE_SZ:
        return formatString(item);
      case TYPE_BLOB:
      case TYPE_BLOB_DATA:
        return `${item.data.readUInt16LE(0)} bytes`;
      case TYPE_BLOB_IDX:
        return `${item.data.readUInt32LE(0)} bytes`;
      default:
        return typeName ? "" : "";
    }
  } catch {
    return "";
  }
}

function formatString(item: NvsItem): string {
  const declaredSize = item.data.readUInt16LE(0);
  if (!item.payload || declaredSize === 0) {
    return `${declaredSize} bytes`;
  }
  const text = readFlashCString(
    item.payload.subarray(0, Math.min(declaredSize, item.payload.length))
  );
  if (!text || /[\x00-\x08\x0b-\x1f\x7f]/.test(text)) {
    return `${declaredSize} bytes`;
  }
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > VALUE_PREVIEW_MAX
    ? `${oneLine.slice(0, VALUE_PREVIEW_MAX)}…`
    : oneLine;
}

export const NVS_CONSTANTS = {
  PAGE_SIZE,
  HEADER_SIZE,
  BITMAP_SIZE,
  ENTRY_SIZE,
  ENTRY_STATE_WRITTEN,
  CHUNK_ANY,
};
