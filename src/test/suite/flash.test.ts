/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { ESP } from "../../config";
import { assertFlashSectionsReadable } from "../../flash/shared/verifyFlashBins";
import { selectedDFUAdapterId } from "../../flash/transports/dfu/helpers";
import {
  buildBaseWriteFlashArgs,
  formatBinPath,
  getFlasherArgs,
  getSingleBinFlasherArgs,
} from "../../flash/transports/uart/flashArgsBuilder";
import { createFlashModel } from "../../flash/transports/uart/flashModelBuilder";
import { FlashModel } from "../../flash/transports/uart/types/flashModel";

function makeFlashModel(partial: Partial<FlashModel> = {}): FlashModel {
  const base: FlashModel = {
    after: "hard_reset",
    app: {
      address: "0x10000",
      binFilePath: "app.bin",
      encrypted: false,
    },
    bootloader: {
      address: "0x1000",
      binFilePath: "bootloader.bin",
      encrypted: false,
    },
    "partition-table": {
      address: "0x8000",
      binFilePath: "partition-table.bin",
      encrypted: false,
    },
    baudRate: "115200",
    before: "default_reset",
    chip: "esp32",
    flashSections: [],
    frequency: "40m",
    mode: "dio",
    port: "COM3",
    size: "2MB",
    stub: true,
    writeFlashArgs: ["--flash_mode", "dio"],
  };
  return { ...base, ...partial, flashSections: partial.flashSections ?? [] };
}

suite("Flash", () => {
  suite("flashArgsBuilder", () => {
    suite("formatBinPath", () => {
      test("leaves path unchanged when replacePathSep is false", () => {
        assert.strictEqual(
          formatBinPath("build/foo/bar.bin", false),
          "build/foo/bar.bin"
        );
      });

      test("replaces forward slashes when replacePathSep is true", () => {
        assert.strictEqual(
          formatBinPath("build/foo/bar.bin", true),
          "build\\foo\\bar.bin"
        );
      });
    });

    suite("buildBaseWriteFlashArgs", () => {
      test("includes chip flag when model.chip is set", () => {
        const model = makeFlashModel({ chip: "esp32c3" });
        const args = buildBaseWriteFlashArgs(model, "/tools/python");
        const chipIdx = args.indexOf("--chip");
        assert.ok(chipIdx !== -1);
        assert.strictEqual(args[chipIdx + 1], "esp32c3");
      });

      test("omits chip flag when model.chip is empty", () => {
        const model = makeFlashModel({ chip: "" });
        const args = buildBaseWriteFlashArgs(model, "/tools/python");
        assert.strictEqual(args.includes("--chip"), false);
      });

      test("adds --no-stub when stub is false", () => {
        const model = makeFlashModel({ stub: false });
        const args = buildBaseWriteFlashArgs(model, "/py");
        assert.strictEqual(args.includes("--no-stub"), true);
      });

      test("does not add --no-stub when stub is true", () => {
        const model = makeFlashModel({ stub: true });
        const args = buildBaseWriteFlashArgs(model, "/py");
        assert.strictEqual(args.includes("--no-stub"), false);
      });

      test("appends write_flash and writeFlashArgs", () => {
        const model = makeFlashModel({
          writeFlashArgs: ["--verify", "0"],
        });
        const args = buildBaseWriteFlashArgs(model, "python");
        const wf = args.indexOf("write_flash");
        assert.ok(wf !== -1);
        assert.deepStrictEqual(args.slice(wf + 1), ["--verify", "0"]);
      });
    });

    suite("getSingleBinFlasherArgs", () => {
      test("adds --encrypt-files when app section is encrypted", () => {
        const model = makeFlashModel({
          app: {
            address: "0x20000",
            binFilePath: "app-enc.bin",
            encrypted: true,
          },
        });
        const args = getSingleBinFlasherArgs(
          model,
          "python",
          ESP.BuildType.App,
          false
        );
        assert.ok(args.includes("--encrypt-files"));
        assert.ok(args.includes("0x20000"));
        assert.ok(args.includes("app-enc.bin"));
      });

      test("targets bootloader section", () => {
        const model = makeFlashModel();
        const args = getSingleBinFlasherArgs(
          model,
          "python",
          ESP.BuildType.Bootloader,
          false
        );
        assert.ok(args.includes("0x1000"));
        assert.ok(args.includes("bootloader.bin"));
      });

      test("uses formatBinPath when replacePathSep is true", () => {
        const model = makeFlashModel({
          "partition-table": {
            address: "0x8000",
            binFilePath: "build/part.bin",
            encrypted: false,
          },
        });
        const args = getSingleBinFlasherArgs(
          model,
          "python",
          ESP.BuildType.PartitionTable,
          true
        );
        assert.ok(args.some((a) => a.includes("\\") && a.includes("build")));
      });
    });

    suite("getFlasherArgs", () => {
      const tool = "python";

      test("lists all sections without encryption flags when encryptPartitions is false", () => {
        const model = makeFlashModel({
          flashSections: [
            {
              address: "0x1000",
              binFilePath: "a.bin",
              encrypted: true,
            },
            {
              address: "0x2000",
              binFilePath: "b.bin",
              encrypted: false,
            },
          ],
        });
        const args = getFlasherArgs(model, tool, false, false);
        const wf = args.indexOf("write_flash");
        assert.deepStrictEqual(args.slice(wf + 1), [
          "--flash_mode",
          "dio",
          "0x1000",
          "a.bin",
          "0x2000",
          "b.bin",
        ]);
      });

      test("uses --encrypt when all sections are encrypted and encryptPartitions is true", () => {
        const model = makeFlashModel({
          flashSections: [
            { address: "0x1", binFilePath: "x.bin", encrypted: true },
            { address: "0x2", binFilePath: "y.bin", encrypted: true },
          ],
        });
        const args = getFlasherArgs(model, tool, true, false);
        assert.ok(args.includes("--encrypt"));
        assert.strictEqual(args.includes("--encrypt-files"), false);
        const encIdx = args.indexOf("--encrypt");
        assert.deepStrictEqual(args.slice(encIdx + 1), [
          "0x1",
          "x.bin",
          "0x2",
          "y.bin",
        ]);
      });

      test("writes unencrypted sections then --encrypt-files when only some are encrypted", () => {
        const model = makeFlashModel({
          flashSections: [
            { address: "0x1000", binFilePath: "boot.bin", encrypted: false },
            { address: "0x10000", binFilePath: "app.bin", encrypted: true },
          ],
        });
        const args = getFlasherArgs(model, tool, true, false);
        const wf = args.indexOf("write_flash");
        const tail = args.slice(wf + 1);
        const ef = tail.indexOf("--encrypt-files");
        assert.ok(ef !== -1);
        assert.deepStrictEqual(tail.slice(0, ef), [
          "--flash_mode",
          "dio",
          "0x1000",
          "boot.bin",
        ]);
        assert.deepStrictEqual(tail.slice(ef), [
          "--encrypt-files",
          "0x10000",
          "app.bin",
        ]);
      });
    });
  });

  suite("createFlashModel", () => {
    test("parses flasher_args_unencrypted.json", async () => {
      const jsonPath = resolve(
        __dirname,
        "..",
        "..",
        "..",
        "testFiles",
        "flasher_args_unencrypted.json"
      );
      const model = await createFlashModel(jsonPath, "COM1", "921600");
      assert.strictEqual(model.port, "COM1");
      assert.strictEqual(model.baudRate, "921600");
      assert.strictEqual(model.chip, "esp32");
      assert.strictEqual(model.stub, true);
      assert.strictEqual(model.before, "default-reset");
      assert.strictEqual(model.after, "hard-reset");
      assert.strictEqual(model.app.binFilePath, "blink.bin");
      assert.strictEqual(
        model.bootloader.binFilePath,
        "bootloader/bootloader.bin"
      );
      assert.strictEqual(
        model["partition-table"].binFilePath,
        "partition_table/partition-table.bin"
      );
      assert.deepStrictEqual(model.writeFlashArgs, [
        "--flash-mode",
        "dio",
        "--flash-size",
        "2MB",
        "--flash-freq",
        "40m",
      ]);
      assert.strictEqual(model.app.encrypted, false);
      assert.strictEqual(model.bootloader.encrypted, false);
      assert.strictEqual(model["partition-table"].encrypted, false);
      assert.strictEqual(model.flashSections.length, 3);
      const addresses = model.flashSections
        .map((s) => s.address)
        .sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
      assert.deepStrictEqual(addresses, ["0x1000", "0x8000", "0x10000"]);
    });

    test("parses mixed encryption fixture", async () => {
      const jsonPath = resolve(
        __dirname,
        "..",
        "..",
        "..",
        "testFiles",
        "flasher_args_mixed_encryption.json"
      );
      const model = await createFlashModel(jsonPath, "/dev/ttyUSB0", "460800");
      assert.strictEqual(model.chip, "esp32c3");
      assert.strictEqual(model.stub, false);
      assert.strictEqual(model.frequency, "80m");
      assert.strictEqual(model.size, "4MB");
      const appSec = model.flashSections.find((s) => s.address === "0x10000");
      const bootSec = model.flashSections.find((s) => s.address === "0x1000");
      assert.ok(appSec?.encrypted === true);
      assert.ok(bootSec?.encrypted === false);
    });

    test("getFlasherArgs matches mixed fixture and encryptPartitions true", async () => {
      const jsonPath = resolve(
        __dirname,
        "..",
        "..",
        "..",
        "testFiles",
        "flasher_args_mixed_encryption.json"
      );
      const model = await createFlashModel(jsonPath, "COM9", "115200");
      const args = getFlasherArgs(model, "python3", true, false);
      assert.ok(args.includes("--encrypt-files"));
      assert.strictEqual(args.includes("--encrypt"), false);
    });
  });

  suite("selectedDFUAdapterId", () => {
    test("returns expected PIDs for known chips", () => {
      assert.strictEqual(selectedDFUAdapterId("esp32s2"), 2);
      assert.strictEqual(selectedDFUAdapterId("esp32s3"), 9);
    });

    test("returns -1 for unknown chip", () => {
      assert.strictEqual(selectedDFUAdapterId("esp32"), -1);
      assert.strictEqual(selectedDFUAdapterId(""), -1);
    });
  });

  suite("assertFlashSectionsReadable", () => {
    test("does not throw when all bin paths are readable", () => {
      const dir = mkdtempSync(join(tmpdir(), "esp-idf-flash-test-"));
      try {
        writeFileSync(join(dir, "one.bin"), "");
        writeFileSync(join(dir, "two.bin"), "");
        const model: FlashModel = {
          ...makeFlashModel(),
          flashSections: [
            { address: "0x0", binFilePath: "one.bin", encrypted: false },
            { address: "0x1000", binFilePath: "two.bin", encrypted: false },
          ],
        };
        assert.doesNotThrow(() => assertFlashSectionsReadable(dir, model));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    test("throws SECTION_BIN_FILE_NOT_ACCESSIBLE when a bin is missing", () => {
      const dir = mkdtempSync(join(tmpdir(), "esp-idf-flash-test-"));
      try {
        writeFileSync(join(dir, "present.bin"), "");
        const model: FlashModel = {
          ...makeFlashModel(),
          flashSections: [
            { address: "0x0", binFilePath: "present.bin", encrypted: false },
            {
              address: "0x1000",
              binFilePath: "missing.bin",
              encrypted: false,
            },
          ],
        };
        assert.throws(
          () => assertFlashSectionsReadable(dir, model),
          (e: unknown) =>
            e instanceof Error && e.message === "SECTION_BIN_FILE_NOT_ACCESSIBLE"
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
