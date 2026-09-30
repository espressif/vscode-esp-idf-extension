/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 1st September 2026 4:10:00 pm
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

import { NVS_CONSTANTS } from "../../espIdf/fsImage/parsers/nvs";
import { SPIFFS_MAGIC_BASE } from "../../espIdf/fsImage/parsers/spiffs";

export interface LfsTagInput {
  type: number;
  id: number;
  size: number;
  data?: Buffer;
}

/** Builds a LittleFS metadata block: big-endian XOR-chained tags, no padding. */
export function buildLfsMetadataBlock(
  revision: number,
  blockSize: number,
  tags: LfsTagInput[]
): Buffer {
  const block = Buffer.alloc(blockSize, 0xff);
  block.writeUInt32LE(revision, 0);
  let previousTag = 0xffffffff;
  let offset = 4;
  for (const tag of tags) {
    const packed = ((tag.type << 20) | (tag.id << 10) | tag.size) >>> 0;
    block.writeUInt32BE((packed ^ previousTag) >>> 0, offset);
    tag.data?.copy(block, offset + 4);
    previousTag = packed;
    offset += 4 + tag.size;
  }
  return block;
}

export function buildLfsSuperblockConfig(
  blockSize: number,
  blockCount: number
): Buffer {
  const config = Buffer.alloc(24);
  config.writeUInt32LE(0x00020001, 0);
  config.writeUInt32LE(blockSize, 4);
  config.writeUInt32LE(blockCount, 8);
  config.writeUInt32LE(64, 12);
  config.writeUInt32LE(0x7fffffff, 16);
  config.writeUInt32LE(0x3fe, 20);
  return config;
}

/**
 * Root metadata pair holding a superblock and one inline file. The second block
 * carries the newer revision, mirroring how littlefs alternates a pair.
 */
export function buildLittlefsImage(
  fileName = "example.txt",
  contents = "hello littlefs"
): Buffer {
  const blockSize = 4096;
  const blockCount = 8;
  const config = buildLfsSuperblockConfig(blockSize, blockCount);
  const nameBuffer = Buffer.from(fileName);
  const contentsBuffer = Buffer.from(contents);

  const olderBlock = buildLfsMetadataBlock(2, blockSize, [
    { type: 0x0ff, id: 0, size: 8, data: Buffer.from("littlefs") },
    { type: 0x201, id: 0, size: config.length, data: config },
  ]);
  const newerBlock = buildLfsMetadataBlock(3, blockSize, [
    { type: 0x0ff, id: 0, size: 8, data: Buffer.from("littlefs") },
    { type: 0x201, id: 0, size: config.length, data: config },
    { type: 0x001, id: 1, size: nameBuffer.length, data: nameBuffer },
    { type: 0x201, id: 1, size: contentsBuffer.length, data: contentsBuffer },
  ]);

  const image = Buffer.alloc(blockSize * blockCount, 0xff);
  olderBlock.copy(image, 0);
  newerBlock.copy(image, blockSize);
  return image;
}

const NVS_PAGE_STATE_ACTIVE = 0xfffffffe;
const NVS_VERSION_V2 = 0xfe;
const NVS_TYPE_U8 = 0x01;
const NVS_TYPE_U32 = 0x04;
const NVS_TYPE_SZ = 0x21;

export function buildNvsImage(): Buffer {
  const page = Buffer.alloc(NVS_CONSTANTS.PAGE_SIZE, 0xff);
  page.writeUInt32LE(NVS_PAGE_STATE_ACTIVE, 0);
  page.writeUInt32LE(0, 4);
  page[8] = NVS_VERSION_V2;

  writeNvsU8Entry(page, 0, 0, "storage", 1);
  writeNvsU8Entry(page, 1, 1, "enabled", 1);
  writeNvsStringEntry(page, 2, 1, "name", "esp32");
  writeNvsU32Entry(page, 4, 1, "counter", 42);
  markNvsEntriesWritten(page, 5);
  return page;
}

function entryOffset(index: number): number {
  return (
    NVS_CONSTANTS.HEADER_SIZE +
    NVS_CONSTANTS.BITMAP_SIZE +
    index * NVS_CONSTANTS.ENTRY_SIZE
  );
}

function writeEntryHeader(
  page: Buffer,
  index: number,
  namespaceIndex: number,
  type: number,
  span: number,
  key: string
): number {
  const offset = entryOffset(index);
  page[offset] = namespaceIndex;
  page[offset + 1] = type;
  page[offset + 2] = span;
  page[offset + 3] = NVS_CONSTANTS.CHUNK_ANY;
  Buffer.from(key).copy(page, offset + 8);
  page.fill(0, offset + 8 + key.length, offset + 24);
  return offset;
}

export function writeNvsU8Entry(
  page: Buffer,
  index: number,
  namespaceIndex: number,
  key: string,
  value: number
): void {
  const offset = writeEntryHeader(
    page,
    index,
    namespaceIndex,
    NVS_TYPE_U8,
    1,
    key
  );
  page[offset + 24] = value;
}

export function writeNvsU32Entry(
  page: Buffer,
  index: number,
  namespaceIndex: number,
  key: string,
  value: number
): void {
  const offset = writeEntryHeader(
    page,
    index,
    namespaceIndex,
    NVS_TYPE_U32,
    1,
    key
  );
  page.writeUInt32LE(value, offset + 24);
}

export function writeNvsStringEntry(
  page: Buffer,
  index: number,
  namespaceIndex: number,
  key: string,
  value: string
): void {
  const payload = Buffer.from(`${value}\0`);
  const span = 1 + Math.ceil(payload.length / NVS_CONSTANTS.ENTRY_SIZE);
  const offset = writeEntryHeader(
    page,
    index,
    namespaceIndex,
    NVS_TYPE_SZ,
    span,
    key
  );
  page.writeUInt16LE(payload.length, offset + 24);
  payload.copy(page, offset + NVS_CONSTANTS.ENTRY_SIZE);
}

export function markNvsEntriesWritten(page: Buffer, count: number): void {
  for (let index = 0; index < count; index++) {
    const bitOffset = index * 2;
    const byteOffset = NVS_CONSTANTS.HEADER_SIZE + (bitOffset >> 3);
    const shift = bitOffset % 8;
    page[byteOffset] &= ~(0x03 << shift) & 0xff;
    page[byteOffset] |= NVS_CONSTANTS.ENTRY_STATE_WRITTEN << shift;
  }
}

/** FAT boot sectors start with either a short jump (0xEB) or a near jump (0xE9). */
export function buildFatImage(jumpByte = 0xeb): Buffer {
  const buf = Buffer.alloc(512, 0);
  buf[0] = jumpByte;
  buf[1] = 0x3c;
  buf[2] = 0x90;
  Buffer.from("MSDOS5.0").copy(buf, 3);
  buf.writeUInt16LE(512, 11);
  buf.write("FAT12   ", 0x36, "ascii");
  buf[510] = 0x55;
  buf[511] = 0xaa;
  return buf;
}

const ESP_IMAGE_MAGIC = 0xe9;
const ESP_IMAGE_HEADER_SIZE = 24;
const ESP_IMAGE_WP_PIN_DISABLED = 0xee;
const ESP_PARTITION_MAGIC = 0x50aa;
const ESP_PARTITION_MAGIC_MD5 = 0xebeb;
const ESP_PARTITION_ENTRY_SIZE = 32;

/** esp_image_header_t followed by one segment header, as esptool writes it. */
export function buildEspAppImage(segmentCount = 6): Buffer {
  const image = Buffer.alloc(64 * 1024, 0x5a);
  image[0] = ESP_IMAGE_MAGIC;
  image[1] = segmentCount;
  image[2] = 0x02;
  image[3] = 0x10;
  image.writeUInt32LE(0x400815bc, 4);
  image[8] = ESP_IMAGE_WP_PIN_DISABLED;
  image.fill(0, 9, ESP_IMAGE_HEADER_SIZE);
  image.writeUInt32LE(0x3f402000, ESP_IMAGE_HEADER_SIZE);
  image.writeUInt32LE(0x7a3c, ESP_IMAGE_HEADER_SIZE + 4);
  return image;
}

export function buildEspPartitionTable(
  partitions: Array<{ type: number; subtype: number; name: string }> = [
    { type: 0x01, subtype: 0x02, name: "nvs" },
    { type: 0x01, subtype: 0x01, name: "phy_init" },
    { type: 0x00, subtype: 0x00, name: "factory" },
    { type: 0x01, subtype: 0x82, name: "storage" },
  ]
): Buffer {
  const image = Buffer.alloc(3072, 0xff);
  let offset = 0;
  let partitionOffset = 0x9000;
  for (const partition of partitions) {
    image.writeUInt16LE(ESP_PARTITION_MAGIC, offset);
    image[offset + 2] = partition.type;
    image[offset + 3] = partition.subtype;
    image.writeUInt32LE(partitionOffset, offset + 4);
    image.writeUInt32LE(0x6000, offset + 8);
    image.fill(0, offset + 12, offset + 28);
    Buffer.from(partition.name).copy(image, offset + 12);
    image.writeUInt32LE(0, offset + 28);
    offset += ESP_PARTITION_ENTRY_SIZE;
    partitionOffset += 0x6000;
  }
  image.writeUInt16LE(ESP_PARTITION_MAGIC_MD5, offset);
  return image;
}

const SPIFFS_PAGE_SIZE = 256;
const SPIFFS_BLOCK_SIZE = 4096;
const SPIFFS_BLOCK_COUNT = 4;
const SPIFFS_OBJ_ID_IX_FLAG = 0x8000;
const SPIFFS_FLAGS_INDEX_HEADER = 0xf8;

/** Mirrors spiffsgen.py output: lookup page with per-block magic, then object pages. */
export function buildSpiffsImage(
  files: Array<{ name: string; size: number; contents?: string | Buffer }> = [
    { name: "/hello.txt", size: 11 },
  ]
): Buffer {
  const image = Buffer.alloc(SPIFFS_BLOCK_SIZE * SPIFFS_BLOCK_COUNT, 0xff);
  for (let blockIndex = 0; blockIndex < SPIFFS_BLOCK_COUNT; blockIndex++) {
    const magic =
      (SPIFFS_MAGIC_BASE ^
        SPIFFS_PAGE_SIZE ^
        (SPIFFS_BLOCK_COUNT - blockIndex)) &
      0xffff;
    image.writeUInt16LE(
      magic,
      blockIndex * SPIFFS_BLOCK_SIZE + SPIFFS_PAGE_SIZE - 4
    );
  }

  files.forEach((file, fileIndex) => {
    const objId = fileIndex + 1;
    const headerPage = 1 + fileIndex * 2;
    const dataPage = headerPage + 1;
    image.writeUInt16LE(objId | SPIFFS_OBJ_ID_IX_FLAG, fileIndex * 2 * 2);
    image.writeUInt16LE(objId, fileIndex * 2 * 2 + 2);

    const offset = headerPage * SPIFFS_PAGE_SIZE;
    image.writeUInt16LE(objId | SPIFFS_OBJ_ID_IX_FLAG, offset);
    image.writeUInt16LE(0, offset + 2);
    image[offset + 4] = SPIFFS_FLAGS_INDEX_HEADER;
    image.writeUInt32LE(file.size, offset + 8);
    image[offset + 12] = 0x01;
    image.fill(0, offset + 13, offset + 13 + 32);
    Buffer.from(file.name).copy(image, offset + 13);

    const dataOffset = dataPage * SPIFFS_PAGE_SIZE;
    image.writeUInt16LE(objId, dataOffset);
    image.writeUInt16LE(0, dataOffset + 2);
    image[dataOffset + 4] = 0xfc;
    if (file.contents !== undefined) {
      const bytes = Buffer.isBuffer(file.contents)
        ? file.contents
        : Buffer.from(file.contents);
      bytes.copy(
        image,
        dataOffset + 5,
        0,
        Math.min(bytes.length, SPIFFS_PAGE_SIZE - 5)
      );
    }
  });

  return image;
}
