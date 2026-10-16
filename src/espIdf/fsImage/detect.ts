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

import { readLittlefsSuperblock } from "./parsers/littlefs";
import { countNvsPages } from "./parsers/nvs";
import { collectSpiffsObjects, findSpiffsGeometry } from "./parsers/spiffs";
import {
  DetectResult,
  FsKind,
  NonFsFormat,
  subtypeHintToKind,
} from "./types";

const SEARCH_WINDOW = 64 * 1024;

const ESP_IMAGE_MAGIC = 0xe9;
const ESP_IMAGE_HEADER_SIZE = 24;
const ESP_IMAGE_WP_PIN_DISABLED = 0xee;
const ESP_IMAGE_MAX_SEGMENTS = 16;
const ESP_PARTITION_MAGIC = 0x50aa;
const ESP_PARTITION_ENTRY_SIZE = 32;
const ESP_PARTITION_MIN_ENTRIES = 2;

export function detectFsType(data: Buffer, subtypeHint?: string): DetectResult {
  const hintKind = subtypeHintToKind(subtypeHint);
  if (!data || data.length === 0) {
    return { kind: "unknown", hintKind, hintMismatch: false };
  }

  const scores: Array<{ kind: FsKind; score: number }> = [
    { kind: "littlefs", score: littlefsScore(data) },
    { kind: "fatfs", score: fatScore(data) },
    { kind: "spiffs", score: spiffsScore(data) },
    { kind: "nvs", score: nvsScore(data) },
  ];
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (best.score <= 0) {
    // Classifying only here keeps FAT boot sectors, whose jump instruction may
    // start with 0xE9, from being reported as application images.
    const nonFsFormat = classifyNonFs(data);
    if (nonFsFormat) {
      return { kind: "unknown", hintKind, hintMismatch: false, nonFsFormat };
    }
    return finish(hintKind ?? "unknown", hintKind);
  }
  const tied = scores.filter((item) => item.score === best.score);
  if (hintKind && tied.some((item) => item.kind === hintKind)) {
    return finish(hintKind, hintKind);
  }
  return finish(best.kind, hintKind);
}

function finish(kind: FsKind, hintKind?: FsKind): DetectResult {
  return {
    kind,
    hintKind,
    hintMismatch: !!hintKind && hintKind !== kind && kind !== "unknown",
  };
}

function classifyNonFs(data: Buffer): NonFsFormat | undefined {
  if (isElf(data)) {
    return "elf";
  }
  if (isEspAppImage(data)) {
    return "espAppImage";
  }
  if (isEspPartitionTable(data)) {
    return "espPartitionTable";
  }
  return isErased(data) ? "erased" : undefined;
}

function isElf(data: Buffer): boolean {
  return (
    data.length >= 4 &&
    data[0] === 0x7f &&
    data[1] === 0x45 &&
    data[2] === 0x4c &&
    data[3] === 0x46
  );
}

function isEspAppImage(data: Buffer): boolean {
  if (data.length < ESP_IMAGE_HEADER_SIZE + 8) {
    return false;
  }
  if (data[0] !== ESP_IMAGE_MAGIC) {
    return false;
  }
  const segmentCount = data[1];
  if (segmentCount === 0 || segmentCount > ESP_IMAGE_MAX_SEGMENTS) {
    return false;
  }
  if (data[8] !== ESP_IMAGE_WP_PIN_DISABLED) {
    return false;
  }
  const firstSegmentLength = data.readUInt32LE(ESP_IMAGE_HEADER_SIZE + 4);
  return firstSegmentLength > 0 && firstSegmentLength <= data.length;
}

function isEspPartitionTable(data: Buffer): boolean {
  let entries = 0;
  for (
    let offset = 0;
    offset + ESP_PARTITION_ENTRY_SIZE <= data.length;
    offset += ESP_PARTITION_ENTRY_SIZE
  ) {
    if (data.readUInt16LE(offset) !== ESP_PARTITION_MAGIC) {
      break;
    }
    entries++;
  }
  return entries >= ESP_PARTITION_MIN_ENTRIES;
}

function isErased(data: Buffer): boolean {
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0xff) {
      return false;
    }
  }
  return true;
}

function nvsScore(data: Buffer): number {
  const pages = countNvsPages(data);
  if (pages === 0) {
    return 0;
  }
  return pages >= 2 ? 3 : 2;
}

function fatScore(data: Buffer): number {
  const limit = Math.min(data.length, SEARCH_WINDOW);
  for (let offset = 0; offset + 512 <= limit; offset += 512) {
    if (looksLikeFatBoot(data, offset)) {
      return 3;
    }
  }
  return 0;
}

function looksLikeFatBoot(data: Buffer, offset: number): boolean {
  if (data[offset + 510] !== 0x55 || data[offset + 511] !== 0xaa) {
    return false;
  }
  const fat16 = data.toString("ascii", offset + 0x36, offset + 0x3b);
  const fat32 = data.toString("ascii", offset + 0x52, offset + 0x5a);
  return fat16.startsWith("FAT") || fat32.includes("FAT");
}

function littlefsScore(data: Buffer): number {
  return readLittlefsSuperblock(data) ? 3 : 0;
}

function spiffsScore(data: Buffer): number {
  const geometry = findSpiffsGeometry(data);
  if (geometry) {
    return 3;
  }
  return collectSpiffsObjects(data).length > 0 ? 2 : 0;
}
