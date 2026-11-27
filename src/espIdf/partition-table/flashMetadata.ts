/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th November 2026
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

export const DEFAULT_PARTITION_TABLE_OFFSET = 0x8000;

export interface PartitionEditorMetadata {
  flashSizeBytes: number;
  partitionTableOffset: number;
}

/** `CONFIG_ESPTOOLPY_FLASHSIZE` is stored as `"4MB"`. */
export function parseFlashSizeBytes(raw: string): number {
  const cleaned = raw.trim().replace(/^"|"$/g, "");
  const match = cleaned.match(/^(\d+)\s*MB$/i);
  if (!match) {
    return 0;
  }
  const megabytes = parseInt(match[1], 10);
  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    return 0;
  }
  return megabytes * 1024 * 1024;
}

/** `CONFIG_PARTITION_TABLE_OFFSET` defaults to 0x8000 when unset or invalid. */
export function parsePartitionTableOffset(raw: string): number {
  const cleaned = raw.trim().replace(/^"|"$/g, "");
  if (!cleaned) {
    return DEFAULT_PARTITION_TABLE_OFFSET;
  }
  const parsed = /^0x/i.test(cleaned)
    ? parseInt(cleaned, 16)
    : parseInt(cleaned, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_PARTITION_TABLE_OFFSET;
  }
  return parsed;
}
