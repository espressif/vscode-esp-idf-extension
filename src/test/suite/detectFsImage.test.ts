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

import * as assert from "assert";
import { detectFsType } from "../../espIdf/fsImage/detect";
import {
  buildEspAppImage,
  buildEspPartitionTable,
  buildFatImage,
  buildLittlefsImage,
  buildNvsImage,
  buildSpiffsImage,
} from "../fixtures/fsImages";

suite("Filesystem image detection", () => {
  test("detects NVS from page headers", () => {
    const result = detectFsType(buildNvsImage());
    assert.strictEqual(result.kind, "nvs");
    assert.strictEqual(result.hintMismatch, false);
  });

  test("detects FAT from boot sector", () => {
    assert.strictEqual(detectFsType(buildFatImage()).kind, "fatfs");
  });

  test("detects SPIFFS magic", () => {
    assert.strictEqual(detectFsType(buildSpiffsImage()).kind, "spiffs");
  });

  test("detects LittleFS name", () => {
    assert.strictEqual(detectFsType(buildLittlefsImage()).kind, "littlefs");
  });

  test("detects FAT when the boot sector uses a near jump", () => {
    assert.strictEqual(detectFsType(buildFatImage(0xe9)).kind, "fatfs");
  });

  test("reports ELF binaries as such", () => {
    const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 1, 1, 1, 0]);
    const result = detectFsType(elf);
    assert.strictEqual(result.kind, "unknown");
    assert.strictEqual(result.nonFsFormat, "elf");
  });

  test("reports application images as such", () => {
    const result = detectFsType(buildEspAppImage());
    assert.strictEqual(result.kind, "unknown");
    assert.strictEqual(result.nonFsFormat, "espAppImage");
  });

  test("does not report LittleFS for app images embedding the name", () => {
    const appImage = buildEspAppImage();
    Buffer.from("esp_littlefs: mount failed").copy(appImage, 0x800);
    const result = detectFsType(appImage);
    assert.strictEqual(result.kind, "unknown");
    assert.strictEqual(result.nonFsFormat, "espAppImage");
  });

  test("reports partition table binaries as such", () => {
    const result = detectFsType(buildEspPartitionTable());
    assert.strictEqual(result.kind, "unknown");
    assert.strictEqual(result.nonFsFormat, "espPartitionTable");
  });

  test("reports erased flash as such", () => {
    const result = detectFsType(Buffer.alloc(4096, 0xff));
    assert.strictEqual(result.kind, "unknown");
    assert.strictEqual(result.nonFsFormat, "erased");
  });

  test("reports erased flash even when a subtype hint is present", () => {
    const result = detectFsType(Buffer.alloc(4096, 0xff), "spiffs");
    assert.strictEqual(result.kind, "unknown");
    assert.strictEqual(result.nonFsFormat, "erased");
    assert.strictEqual(result.hintMismatch, false);
  });

  test("leaves nonFsFormat unset for recognized filesystems", () => {
    assert.strictEqual(detectFsType(buildNvsImage()).nonFsFormat, undefined);
    assert.strictEqual(
      detectFsType(buildLittlefsImage()).nonFsFormat,
      undefined
    );
  });

  test("uses subtype hint when sniff is unknown", () => {
    const result = detectFsType(Buffer.from("not a filesystem"), "spiffs");
    assert.strictEqual(result.kind, "spiffs");
    assert.strictEqual(result.hintMismatch, false);
  });

  test("prefers sniffed type when it disagrees with subtype hint", () => {
    const result = detectFsType(buildFatImage(), "nvs");
    assert.strictEqual(result.kind, "fatfs");
    assert.strictEqual(result.hintMismatch, true);
    assert.strictEqual(result.hintKind, "nvs");
  });
});
