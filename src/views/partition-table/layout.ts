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

/** Sector size used by gen_esp32part for data offsets and partition sizes. */
export const SECTOR_SIZE = 0x1000;
/** App offsets must be 64 KB aligned so the following app can start on an MMU boundary. */
export const APP_ALIGNMENT = 0x10000;
/** Bytes reserved for the partition table after CONFIG_PARTITION_TABLE_OFFSET. */
export const PARTITION_TABLE_SIZE = 0x1000;
/** Custom non-app partitions can be sized in 1 KB steps. */
export const CUSTOM_DATA_STEP = 0x400;

const MIN_VISIBLE_SEGMENT_PERCENT = 1.4;

const RECOMMENDED_SIZES: Record<string, number> = {
  nvs: 0x3000,
  ota: 0x2000,
  fat: 528 * 1024,
  spiffs: 192 * 1024,
  littlefs: 128 * 1024,
  coredump: 64 * 1024,
  phy: 0x1000,
};

export interface LayoutInputRow {
  name: string;
  type: string;
  subtype: string;
  offset: string;
  size: string;
}

export interface ResolvedPartition {
  index: number;
  name: string;
  type: string;
  subtype: string;
  offset: number;
  size: number;
  end: number;
  fixedOffset: boolean;
  step: number;
  minSize: number;
  maxSize: number;
  reclaimable: number;
  canFit: boolean;
  recommended?: number;
}

export interface FlashSegment {
  id: string;
  kind: "reserved" | "partition" | "free";
  name: string;
  meta: string;
  title: string;
  width: number;
  index?: number;
}

export interface LayoutWarning {
  message: string;
}

export interface FlashLayout {
  partitions: ResolvedPartition[];
  segments: FlashSegment[];
  warnings: LayoutWarning[];
  usedBytes: number;
  freeBytes: number;
  flashSize: number;
  partitionTableOffset: number;
}

export interface SizeUpdate {
  index: number;
  size: string;
}

interface PlacedPartition {
  index: number;
  name: string;
  type: string;
  subtype: string;
  offset: number;
  size: number;
  end: number;
  fixedOffset: boolean;
}

export function parseSizeToken(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const sized = trimmed.match(/^(\d+)([KkMm])$/);
  if (sized) {
    const amount = parseInt(sized[1], 10);
    if (!Number.isFinite(amount)) {
      return null;
    }
    return sized[2].toLowerCase() === "m" ? amount * 1024 * 1024 : amount * 1024;
  }
  if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  return null;
}

/** Prefer K or M when the byte count divides evenly so the CSV stays readable. */
export function formatSizeToken(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0x0";
  }
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)}M`;
  }
  if (bytes % 1024 === 0) {
    return `${bytes / 1024}K`;
  }
  return `0x${bytes.toString(16)}`;
}

export function formatByteLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MB`;
  }
  if (bytes % 1024 === 0) {
    return `${bytes / 1024} KB`;
  }
  if (bytes > 1024) {
    const kilobytes = bytes / 1024;
    return `${trimNumber(kilobytes)} KB`;
  }
  return `${bytes} B`;
}

export function formatHexOffset(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0x0";
  }
  return `0x${value.toString(16).toUpperCase()}`;
}

export function recommendedSize(subtype: string): number | undefined {
  return RECOMMENDED_SIZES[subtype];
}

export function stepFor(type: string): number {
  if (!isAppType(type) && !isDataType(type)) {
    return CUSTOM_DATA_STEP;
  }
  return SECTOR_SIZE;
}

export function resolveLayout(
  rows: LayoutInputRow[],
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): FlashLayout {
  const placed = resolveOffsets(rows, partitionTableOffset);
  const partitions = placed.map((part) => {
    const step = stepFor(rows[part.index]?.type ?? "");
    const largest = largestFittingSize(
      rows,
      part.index,
      flashSize,
      partitionTableOffset,
      equalOtaSlots
    );
    const reclaimable = alignDown(
      immediateGap(placed, part.index, flashSize),
      step
    );
    // Keep a stored size smaller than the step, such as the 1 KB Zigbee zb_fct partition, selectable.
    const minSize = part.size > 0 && part.size < step ? part.size : step;
    return {
      index: part.index,
      name: part.name,
      type: part.type,
      subtype: part.subtype,
      offset: part.offset,
      size: part.size,
      end: part.end,
      fixedOffset: part.fixedOffset,
      step,
      minSize,
      maxSize: Math.max(largest, part.size || step),
      reclaimable,
      canFit: flashSize > 0 && largest > part.size,
      recommended: recommendedSize(rows[part.index]?.subtype ?? ""),
    };
  });

  return {
    partitions,
    segments: buildSegments(placed, flashSize, partitionTableOffset),
    warnings: buildWarnings(
      rows,
      placed,
      flashSize,
      partitionTableOffset,
      equalOtaSlots
    ),
    usedBytes: placed.reduce((total, part) => total + part.size, 0),
    freeBytes: freeBytesAfterTable(placed, flashSize, partitionTableOffset),
    flashSize,
    partitionTableOffset,
  };
}

export function applySize(
  rows: LayoutInputRow[],
  index: number,
  requested: number,
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): SizeUpdate[] {
  if (!rows[index]) {
    return [];
  }
  const step = stepFor(rows[index].type);
  let target = alignDown(Math.max(requested, step), step);
  if (target < step) {
    target = step;
  }
  const largest = largestFittingSize(
    rows,
    index,
    flashSize,
    partitionTableOffset,
    equalOtaSlots
  );
  target = Math.min(target, Math.max(largest, step));
  target = alignDown(target, step);
  if (target < step) {
    target = step;
  }
  return updatesFor(rows, index, target, equalOtaSlots);
}

export function reclaimSize(
  rows: LayoutInputRow[],
  index: number,
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): SizeUpdate[] {
  const placed = resolveOffsets(rows, partitionTableOffset);
  const self = placed[index];
  if (!self || self.size <= 0) {
    return [];
  }
  const addition = alignDown(immediateGap(placed, index, flashSize), stepFor(rows[index].type));
  if (addition <= 0) {
    return [];
  }
  return applySize(
    rows,
    index,
    self.size + addition,
    flashSize,
    partitionTableOffset,
    equalOtaSlots
  );
}

export function fitSize(
  rows: LayoutInputRow[],
  index: number,
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): SizeUpdate[] {
  if (flashSize <= 0 || !rows[index]) {
    return [];
  }
  const largest = largestFittingSize(
    rows,
    index,
    flashSize,
    partitionTableOffset,
    equalOtaSlots
  );
  return applySize(
    rows,
    index,
    largest,
    flashSize,
    partitionTableOffset,
    equalOtaSlots
  );
}

export function recommendSize(
  rows: LayoutInputRow[],
  index: number,
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): SizeUpdate[] {
  const recommended = recommendedSize(rows[index]?.subtype ?? "");
  if (!recommended) {
    return [];
  }
  return applySize(
    rows,
    index,
    recommended,
    flashSize,
    partitionTableOffset,
    equalOtaSlots
  );
}

function updatesFor(
  rows: LayoutInputRow[],
  index: number,
  size: number,
  equalOtaSlots: boolean
): SizeUpdate[] {
  const token = formatSizeToken(size);
  const updates = [{ index, size: token }];
  if (!equalOtaSlots) {
    return updates;
  }
  const pair = pairedOtaIndex(rows, index);
  if (pair >= 0) {
    updates.push({ index: pair, size: token });
  }
  return updates;
}

/**
 * Blank offsets are filled the way gen_esp32part does: walk the CSV in order,
 * align data to 4 KB and apps to 64 KB, and keep an explicit offset where it is.
 */
function resolveOffsets(
  rows: LayoutInputRow[],
  partitionTableOffset: number
): PlacedPartition[] {
  const base = partitionTableOffset + PARTITION_TABLE_SIZE;
  let cursor = base;
  return rows.map((row, index) => {
    const parsedSize = parseSizeToken(row.size);
    const size = parsedSize !== null && parsedSize > 0 ? parsedSize : 0;
    const parsedOffset = row.offset.trim() ? parseSizeToken(row.offset) : null;
    const fixedOffset = parsedOffset !== null;
    let offset: number;
    if (fixedOffset) {
      offset = parsedOffset;
    } else {
      let start = Math.max(cursor, base);
      if (isAppType(row.type)) {
        start = Math.max(start, APP_ALIGNMENT);
      }
      offset = alignUp(start, isAppType(row.type) ? APP_ALIGNMENT : SECTOR_SIZE);
    }
    cursor = Math.max(cursor, offset + size);
    return {
      index,
      name: row.name,
      type: row.type,
      subtype: row.subtype,
      offset,
      size,
      end: offset + size,
      fixedOffset,
    };
  });
}

function sizeFits(
  rows: LayoutInputRow[],
  index: number,
  size: number,
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): boolean {
  const next = rows.map((row) => ({ ...row }));
  const token = formatSizeToken(size);
  next[index] = { ...next[index], size: token };
  if (equalOtaSlots) {
    const pair = pairedOtaIndex(rows, index);
    if (pair >= 0) {
      next[pair] = { ...next[pair], size: token };
    }
  }
  const placed = resolveOffsets(next, partitionTableOffset);
  if (hasOverlap(placed, partitionTableOffset)) {
    return false;
  }
  if (flashSize > 0 && placed.some((part) => part.size > 0 && part.end > flashSize)) {
    return false;
  }
  return true;
}

function largestFittingSize(
  rows: LayoutInputRow[],
  index: number,
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): number {
  const row = rows[index];
  if (!row) {
    return SECTOR_SIZE;
  }
  const step = stepFor(row.type);
  const current = parseSizeToken(row.size) ?? 0;
  let upper = flashSize > 0 ? flashSize : Math.max(current, step) + 16 * 1024 * 1024;
  const placed = resolveOffsets(rows, partitionTableOffset);
  const self = placed[index];
  if (self) {
    const nextFixed = placed
      .filter((part) => part.index !== index && part.fixedOffset && part.offset > self.offset)
      .sort((a, b) => a.offset - b.offset)[0];
    if (nextFixed) {
      const room = nextFixed.offset - self.offset;
      if (room > 0) {
        upper = Math.min(upper, room);
      }
    }
  }
  let low = 1;
  let high = Math.max(1, Math.floor(upper / step));
  let best = step;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const size = mid * step;
    if (sizeFits(rows, index, size, flashSize, partitionTableOffset, equalOtaSlots)) {
      best = size;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function hasOverlap(placed: PlacedPartition[], partitionTableOffset: number): boolean {
  const base = partitionTableOffset + PARTITION_TABLE_SIZE;
  const sorted = placed
    .filter((part) => part.size > 0)
    .sort((a, b) => a.offset - b.offset || a.index - b.index);
  for (const part of sorted) {
    if (part.offset < base) {
      return true;
    }
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].offset < sorted[i - 1].end) {
      return true;
    }
  }
  return false;
}

function immediateGap(
  placed: PlacedPartition[],
  index: number,
  flashSize: number
): number {
  const self = placed[index];
  if (!self || self.size <= 0) {
    return 0;
  }
  const sorted = placed
    .filter((part) => part.size > 0)
    .sort((a, b) => a.offset - b.offset || a.index - b.index);
  const position = sorted.findIndex((part) => part.index === index);
  const next = position >= 0 ? sorted[position + 1] : undefined;
  const boundary = next ? next.offset : flashSize;
  if (boundary <= self.end) {
    return 0;
  }
  return boundary - self.end;
}

function freeBytesAfterTable(
  placed: PlacedPartition[],
  flashSize: number,
  partitionTableOffset: number
): number {
  if (flashSize <= 0) {
    return 0;
  }
  const base = partitionTableOffset + PARTITION_TABLE_SIZE;
  const sorted = placed
    .filter((part) => part.size > 0)
    .sort((a, b) => a.offset - b.offset || a.index - b.index);
  let cursor = base;
  let free = 0;
  for (const part of sorted) {
    if (part.offset > cursor) {
      const gapEnd = Math.min(part.offset, flashSize);
      if (gapEnd > cursor) {
        free += gapEnd - cursor;
      }
    }
    cursor = Math.max(cursor, part.end);
    if (cursor >= flashSize) {
      return free;
    }
  }
  if (cursor < flashSize) {
    free += flashSize - cursor;
  }
  return free;
}

function buildWarnings(
  rows: LayoutInputRow[],
  placed: PlacedPartition[],
  flashSize: number,
  partitionTableOffset: number,
  equalOtaSlots: boolean
): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const base = partitionTableOffset + PARTITION_TABLE_SIZE;
  const sorted = placed
    .filter((part) => part.size > 0)
    .sort((a, b) => a.offset - b.offset || a.index - b.index);

  for (const part of sorted) {
    if (part.offset < base) {
      warnings.push({
        message: `${labelOf(part)} starts before the partition table ends (${formatHexOffset(base)}).`,
      });
    }
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].offset < sorted[i - 1].end) {
      warnings.push({
        message: `${labelOf(sorted[i - 1])} overlaps ${labelOf(sorted[i])}.`,
      });
    }
  }

  if (flashSize > 0) {
    const overflowing = sorted.filter((part) => part.end > flashSize);
    if (overflowing.length) {
      warnings.push({
        message: `Layout extends past flash (${formatByteLabel(flashSize)}): ${overflowing
          .map(labelOf)
          .join(", ")}.`,
      });
    }
    const free = freeBytesAfterTable(placed, flashSize, partitionTableOffset);
    if (free > 0 && overflowing.length === 0) {
      warnings.push({
        message: `${formatByteLabel(free)} of flash is still free.`,
      });
    }
  }

  const hasOtaApp = rows.some(
    (row) => isAppType(row.type) && /^ota_([0-9]|1[0-5])$/.test(row.subtype)
  );
  const hasOtaData = rows.some((row) => isDataType(row.type) && row.subtype === "ota");
  const hasNvs = rows.some((row) => isDataType(row.type) && row.subtype === "nvs");
  if (hasOtaApp && !hasOtaData) {
    warnings.push({
      message: "OTA app slots need a data/ota partition (otadata).",
    });
  }
  if ((hasOtaApp || hasOtaData) && !hasNvs) {
    warnings.push({
      message: "OTA needs an nvs partition.",
    });
  }
  if (equalOtaSlots) {
    const ota0 = rows.find((row) => isAppType(row.type) && row.subtype === "ota_0");
    const ota1 = rows.find((row) => isAppType(row.type) && row.subtype === "ota_1");
    const size0 = ota0 ? parseSizeToken(ota0.size) : null;
    const size1 = ota1 ? parseSizeToken(ota1.size) : null;
    if (ota0 && ota1 && size0 !== null && size1 !== null && size0 !== size1) {
      warnings.push({
        message:
          "ota_0 and ota_1 have different sizes. Resizing either slot keeps them equal.",
      });
    }
  }
  return warnings;
}

function buildSegments(
  placed: PlacedPartition[],
  flashSize: number,
  partitionTableOffset: number
): FlashSegment[] {
  if (flashSize <= 0) {
    return [];
  }
  const sorted = placed
    .filter((part) => part.size > 0)
    .sort((a, b) => a.offset - b.offset || a.index - b.index);
  const highestEnd = sorted.reduce((max, part) => Math.max(max, part.end), 0);
  const scale = Math.max(flashSize, highestEnd, 1);
  const pending: Array<Omit<FlashSegment, "width"> & { percentage: number }> = [];

  const pushGap = (start: number, length: number, name: string, kind: "reserved" | "free") => {
    if (length <= 0) {
      return;
    }
    pending.push({
      id: `${kind}-${start}`,
      kind,
      name,
      meta: formatByteLabel(length),
      title: `${name}\n${formatHexOffset(start)} - ${formatHexOffset(start + length)} (${formatByteLabel(length)})`,
      percentage: (length / scale) * 100,
    });
  };

  const base = partitionTableOffset + PARTITION_TABLE_SIZE;
  if (!sorted.length) {
    pushGap(0, Math.min(base, scale), "Reserved", "reserved");
    pushGap(base, Math.max(0, Math.min(flashSize, scale) - base), "Unused Flash", "free");
  } else {
    const reservedEnd = Math.min(base, sorted[0].offset);
    let cursor = 0;
    if (reservedEnd > 0) {
      pushGap(0, reservedEnd, "Reserved", "reserved");
      cursor = reservedEnd;
    }
    for (const part of sorted) {
      if (part.offset > cursor) {
        pushGap(cursor, part.offset - cursor, "Free Space", "free");
      }
      pending.push({
        id: `partition-${part.index}`,
        kind: "partition",
        name: part.name || "Unnamed",
        meta: formatByteLabel(part.size),
        title: `${part.name || "Partition"} (${part.type}/${part.subtype})\nSize: ${formatByteLabel(part.size)} (${part.size} bytes)\nOffset: ${formatHexOffset(part.offset)} - ${formatHexOffset(part.end)}`,
        index: part.index,
        percentage: (part.size / scale) * 100,
      });
      cursor = Math.max(cursor, part.end);
    }
    if (cursor < flashSize) {
      pushGap(cursor, flashSize - cursor, "Unused Flash", "free");
    }
  }

  const widths = balancedWidths(pending.map((segment) => segment.percentage));
  return pending.map((segment, index) => ({
    id: segment.id,
    kind: segment.kind,
    name: segment.name,
    meta: segment.meta,
    title: segment.title,
    index: segment.index,
    width: widths[index] ?? 0,
  }));
}

function balancedWidths(percentages: number[]): number[] {
  const positive = percentages
    .map((percentage, index) => ({ percentage, index }))
    .filter((segment) => segment.percentage > 0);
  if (!positive.length) {
    return percentages.map(() => 0);
  }
  const minimum = Math.min(MIN_VISIBLE_SEGMENT_PERCENT, 100 / positive.length);
  const small = new Set(
    positive.filter((segment) => segment.percentage < minimum).map((segment) => segment.index)
  );
  const reserved = small.size * minimum;
  const largeTotal = positive.reduce((total, segment) => {
    return small.has(segment.index) ? total : total + segment.percentage;
  }, 0);
  if (largeTotal <= 0 || reserved >= 100) {
    const equal = 100 / positive.length;
    return percentages.map((percentage) => (percentage > 0 ? equal : 0));
  }
  const scale = (100 - reserved) / largeTotal;
  return percentages.map((percentage, index) => {
    if (percentage <= 0) {
      return 0;
    }
    if (small.has(index)) {
      return minimum;
    }
    return percentage * scale;
  });
}

function pairedOtaIndex(rows: LayoutInputRow[], index: number): number {
  const row = rows[index];
  if (!row || !isAppType(row.type)) {
    return -1;
  }
  const other = row.subtype === "ota_0" ? "ota_1" : row.subtype === "ota_1" ? "ota_0" : "";
  if (!other) {
    return -1;
  }
  return rows.findIndex(
    (candidate, candidateIndex) =>
      candidateIndex !== index && isAppType(candidate.type) && candidate.subtype === other
  );
}

function labelOf(part: PlacedPartition): string {
  return part.name || `partition ${part.index + 1}`;
}

function isAppType(type: string): boolean {
  return type === "app" || type === "0x00" || type === "0";
}

function isDataType(type: string): boolean {
  return type === "data" || type === "0x01" || type === "1";
}

function alignUp(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

function alignDown(value: number, alignment: number): number {
  return Math.floor(value / alignment) * alignment;
}

function trimNumber(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
