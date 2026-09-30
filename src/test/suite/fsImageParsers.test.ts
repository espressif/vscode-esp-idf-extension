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
import { ensureDir, writeFile } from "fs-extra";
import { join } from "path";
import { listFatfs, readFatfsFile } from "../../espIdf/fsImage/parsers/fatfs";
import {
  listLittlefs,
  readLittlefsFile,
} from "../../espIdf/fsImage/parsers/littlefs";
import { listNvs, readNvsFile } from "../../espIdf/fsImage/parsers/nvs";
import {
  findSpiffsGeometry,
  listSpiffs,
  readSpiffsFile,
} from "../../espIdf/fsImage/parsers/spiffs";
import { workspaceDestination } from "../../espIdf/fsImage/savePath";
import {
  buildLfsMetadataBlock,
  buildLfsSuperblockConfig,
  buildLittlefsImage,
  buildNvsImage,
  buildSpiffsImage,
} from "../fixtures/fsImages";

suite("Filesystem image parsers", () => {
  test("lists NVS namespaces with typed values", () => {
    const root = listNvs(buildNvsImage());
    assert.strictEqual(root.children?.length, 1);
    const storage = root.children![0];
    assert.strictEqual(storage.name, "storage");
    const keys = (storage.children || []).map((child) => child.name);
    assert.deepStrictEqual(keys, ["counter", "enabled", "name"]);
  });

  test("reads NVS scalar and string values", () => {
    const storage = listNvs(buildNvsImage()).children![0];
    const byKey = new Map(
      (storage.children || []).map((child) => [child.name, child])
    );
    assert.strictEqual(byKey.get("enabled")?.nvsType, "u8");
    assert.strictEqual(byKey.get("enabled")?.nvsValuePreview, "1");
    assert.strictEqual(byKey.get("counter")?.nvsType, "u32");
    assert.strictEqual(byKey.get("counter")?.nvsValuePreview, "42");
    assert.strictEqual(byKey.get("name")?.nvsType, "string");
    assert.strictEqual(byKey.get("name")?.nvsValuePreview, "esp32");
    assert.deepStrictEqual(
      readNvsFile(buildNvsImage(), "/storage/name"),
      Buffer.from("esp32")
    );
    assert.deepStrictEqual(
      readNvsFile(buildNvsImage(), "/storage/counter"),
      Buffer.from("42")
    );
  });

  test("does not treat NVS string payload entries as keys", () => {
    const storage = listNvs(buildNvsImage()).children![0];
    assert.ok(!storage.children?.some((child) => child.name === "esp32"));
  });

  test("finds SPIFFS geometry from per-block magic", () => {
    const geometry = findSpiffsGeometry(buildSpiffsImage());
    assert.strictEqual(geometry?.pageSize, 256);
    assert.strictEqual(geometry?.blockSize, 4096);
  });

  test("lists SPIFFS file names and sizes", () => {
    const root = listSpiffs(buildSpiffsImage());
    assert.strictEqual(root.children?.[0].name, "hello.txt");
    assert.strictEqual(root.children?.[0].path, "/hello.txt");
    assert.strictEqual(root.children?.[0].size, 11);
  });

  test("nests SPIFFS paths", () => {
    const root = listSpiffs(
      buildSpiffsImage([{ name: "/www/index.html", size: 4 }])
    );
    assert.strictEqual(root.children?.[0].name, "www");
    assert.strictEqual(root.children?.[0].isDir, true);
    assert.strictEqual(root.children?.[0].children?.[0].name, "index.html");
    assert.strictEqual(
      root.children?.[0].children?.[0].path,
      "/www/index.html"
    );
  });

  test("reads SPIFFS file bytes, including a second data page", () => {
    const pageSize = 256;
    const firstLen = pageSize - 5;
    const contents = Buffer.concat([
      Buffer.alloc(firstLen, 0x11),
      Buffer.from("xyz"),
    ]);
    const image = buildSpiffsImage([
      { name: "/www/index.html", size: contents.length, contents },
    ]);
    const secondPage = 3 * pageSize;
    image.writeUInt16LE(1, secondPage);
    image.writeUInt16LE(1, secondPage + 2);
    image[secondPage + 4] = 0xfc;
    contents.copy(image, secondPage + 5, firstLen);

    const bytes = readSpiffsFile(image, "/www/index.html");
    assert.ok(bytes);
    assert.deepStrictEqual(bytes, contents);
  });

  test("lists LittleFS file with size from the newest metadata block", () => {
    const root = listLittlefs(buildLittlefsImage("example.txt", "hi there"));
    assert.strictEqual(root.children?.length, 1);
    assert.strictEqual(root.children?.[0].name, "example.txt");
    assert.strictEqual(root.children?.[0].isDir, false);
    assert.strictEqual(root.children?.[0].size, 8);
    assert.deepStrictEqual(
      readLittlefsFile(
        buildLittlefsImage("example.txt", "hi there"),
        "/example.txt"
      ),
      Buffer.from("hi there")
    );
  });

  test("skips the LittleFS superblock entry", () => {
    const root = listLittlefs(buildLittlefsImage());
    assert.ok(!root.children?.some((child) => child.name === "littlefs"));
  });

  test("lists LittleFS subdirectory contents", () => {
    const blockSize = 4096;
    const blockCount = 8;
    const config = buildLfsSuperblockConfig(blockSize, blockCount);
    const childPair = Buffer.alloc(8);
    childPair.writeUInt32LE(2, 0);
    childPair.writeUInt32LE(3, 4);
    const ctzStruct = Buffer.alloc(8);
    ctzStruct.writeUInt32LE(5, 0);
    ctzStruct.writeUInt32LE(1234, 4);

    const rootBlock = buildLfsMetadataBlock(3, blockSize, [
      { type: 0x0ff, id: 0, size: 8, data: Buffer.from("littlefs") },
      { type: 0x201, id: 0, size: config.length, data: config },
      { type: 0x002, id: 1, size: 3, data: Buffer.from("www") },
      { type: 0x200, id: 1, size: 8, data: childPair },
    ]);
    const childBlock = buildLfsMetadataBlock(1, blockSize, [
      { type: 0x001, id: 0, size: 10, data: Buffer.from("index.html") },
      { type: 0x202, id: 0, size: 8, data: ctzStruct },
    ]);

    const image = Buffer.alloc(blockSize * blockCount, 0xff);
    rootBlock.copy(image, 0);
    childBlock.copy(image, blockSize * 2);

    const root = listLittlefs(image);
    assert.strictEqual(root.children?.[0].name, "www");
    assert.strictEqual(root.children?.[0].isDir, true);
    assert.strictEqual(root.children?.[0].children?.[0].name, "index.html");
    assert.strictEqual(root.children?.[0].children?.[0].size, 1234);
  });

  test("reads a LittleFS file nested in a directory", () => {
    const blockSize = 4096;
    const blockCount = 8;
    const config = buildLfsSuperblockConfig(blockSize, blockCount);
    const childPair = Buffer.alloc(8);
    childPair.writeUInt32LE(2, 0);
    childPair.writeUInt32LE(3, 4);
    const rootBlock = buildLfsMetadataBlock(3, blockSize, [
      { type: 0x0ff, id: 0, size: 8, data: Buffer.from("littlefs") },
      { type: 0x201, id: 0, size: config.length, data: config },
      { type: 0x002, id: 1, size: 3, data: Buffer.from("www") },
      { type: 0x200, id: 1, size: 8, data: childPair },
    ]);
    const childBlock = buildLfsMetadataBlock(1, blockSize, [
      { type: 0x001, id: 0, size: 10, data: Buffer.from("index.html") },
      { type: 0x201, id: 0, size: 2, data: Buffer.from("hi") },
    ]);
    const image = Buffer.alloc(blockSize * blockCount, 0xff);
    rootBlock.copy(image, 0);
    childBlock.copy(image, blockSize * 2);

    assert.deepStrictEqual(
      readLittlefsFile(image, "/www/index.html"),
      Buffer.from("hi")
    );
  });

  test("reads a LittleFS file stored across CTZ blocks", () => {
    const blockSize = 4096;
    const blockCount = 8;
    const config = buildLfsSuperblockConfig(blockSize, blockCount);
    const fileSize = 4100;
    const ctz = Buffer.alloc(8);
    ctz.writeUInt32LE(5, 0);
    ctz.writeUInt32LE(fileSize, 4);
    const older = buildLfsMetadataBlock(1, blockSize, [
      { type: 0x0ff, id: 0, size: 8, data: Buffer.from("littlefs") },
      { type: 0x201, id: 0, size: config.length, data: config },
    ]);
    const newer = buildLfsMetadataBlock(2, blockSize, [
      { type: 0x0ff, id: 0, size: 8, data: Buffer.from("littlefs") },
      { type: 0x201, id: 0, size: config.length, data: config },
      { type: 0x001, id: 1, size: 8, data: Buffer.from("wide.bin") },
      { type: 0x202, id: 1, size: 8, data: ctz },
    ]);
    const image = Buffer.alloc(blockSize * blockCount, 0xff);
    older.copy(image, 0);
    newer.copy(image, blockSize);
    image.fill(0x41, blockSize * 4, blockSize * 5);
    image.writeUInt32LE(4, blockSize * 5);
    image.fill(0x42, blockSize * 5 + 4, blockSize * 5 + 8);

    const bytes = readLittlefsFile(image, "/wide.bin");
    assert.ok(bytes);
    assert.strictEqual(bytes.length, fileSize);
    assert.strictEqual(bytes[0], 0x41);
    assert.strictEqual(bytes[4095], 0x41);
    assert.strictEqual(bytes[4096], 0x42);
    assert.strictEqual(bytes[4099], 0x42);
  });

  test("reports an error when no LittleFS entries exist", () => {
    const root = listLittlefs(Buffer.alloc(4096 * 2, 0xff));
    assert.ok(root.error);
  });

  test("FAT parser reports missing fatfsparse.py", async () => {
    const root = await listFatfs("/tmp/missing.bin", {
      pythonPath: "/usr/bin/python3",
      fatfsparsePath: "/definitely/missing/fatfsparse.py",
      spawnFn: async () => {
        throw new Error("fatfsparse.py should not be spawned");
      },
    });
    assert.ok(root.error?.includes("fatfsparse.py"));
  });

  test("FAT parser surfaces spawn failures", async () => {
    const root = await listFatfs("/tmp/fat.bin", {
      pythonPath: "/usr/bin/python3",
      fatfsparsePath: __filename,
      spawnFn: async () => {
        throw new Error("non zero exit code 1");
      },
    });
    assert.ok(root.error?.includes("non zero exit code 1"));
  });

  test("FAT parser lifts the volume label directory", async () => {
    const root = await listFatfs("/tmp/fat.bin", {
      pythonPath: "/usr/bin/python3",
      fatfsparsePath: __filename,
      spawnFn: async (_cmd, _args, options) => {
        const dir = join(options?.cwd as string, "ESPRESSIF", "WWW");
        await ensureDir(dir);
        await writeFile(join(dir, "index.html"), "hi");
        return Buffer.alloc(0);
      },
    });
    assert.strictEqual(root.children?.[0].name, "WWW");
    assert.strictEqual(root.children?.[0].path, "/WWW");
    assert.strictEqual(
      root.children?.[0].children?.[0].path,
      "/WWW/index.html"
    );
  });

  test("FAT parser walks extracted tree from spawn", async () => {
    const root = await listFatfs("/tmp/fat.bin", {
      pythonPath: "/usr/bin/python3",
      fatfsparsePath: __filename,
      spawnFn: async (_cmd, _args, options) => {
        const cwd = options?.cwd as string;
        await ensureDir(join(cwd, "VOL"));
        await writeFile(join(cwd, "VOL", "readme.txt"), "hi");
        await writeFile(join(cwd, "boot.cfg"), "x");
        return Buffer.alloc(0);
      },
    });
    const names = (root.children || []).map((child) => child.name);
    assert.deepStrictEqual(names, ["VOL", "boot.cfg"]);
    const volume = root.children![0];
    assert.strictEqual(volume.children?.[0].name, "readme.txt");
    assert.strictEqual(volume.children?.[0].size, 2);
  });

  test("reads a file back from an extracted FAT image", async () => {
    const bytes = await readFatfsFile("/tmp/fat.bin", "/WWW/index.html", {
      pythonPath: "/usr/bin/python3",
      fatfsparsePath: __filename,
      spawnFn: async (_cmd, _args, options) => {
        const dir = join(options?.cwd as string, "ESPRESSIF", "WWW");
        await ensureDir(dir);
        await writeFile(join(dir, "index.html"), "hi");
        return Buffer.alloc(0);
      },
    });
    assert.strictEqual(bytes?.toString(), "hi");
  });

  test("places an image path inside the workspace", () => {
    assert.strictEqual(
      workspaceDestination("/proj", "/tmp/storage.bin", "/example.txt"),
      join("/proj", "filesFromImage", "storage", "example.txt")
    );
    assert.strictEqual(
      workspaceDestination("/proj", "/tmp/storage.bin", "/www/index.html"),
      join("/proj", "filesFromImage", "storage", "www", "index.html")
    );
    assert.strictEqual(
      workspaceDestination("/proj", "/tmp/storage.bin", "/../etc/passwd"),
      undefined
    );
    assert.strictEqual(
      workspaceDestination("/proj", "/tmp/storage.bin", "/"),
      undefined
    );
  });
});
