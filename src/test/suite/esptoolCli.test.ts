/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import {
  esptoolProgramArgs,
  esptoolUsesHyphenCli,
  formatEsptoolArgs,
  formatEsptoolToken,
} from "../../flash/shared/esptool/esptoolCli";

suite("esptool CLI names", () => {
  test("keeps underscore names below esptool 5", () => {
    assert.strictEqual(esptoolUsesHyphenCli("4.8.1"), false);
    assert.strictEqual(esptoolUsesHyphenCli("4.9.0"), false);
  });

  test("uses hyphen names from esptool 5.0.0", () => {
    assert.strictEqual(esptoolUsesHyphenCli("5.0.0"), true);
    assert.strictEqual(esptoolUsesHyphenCli("5.0.2"), true);
    assert.strictEqual(esptoolUsesHyphenCli("5.1.0"), true);
  });

  test("formats subcommands and long options without rewriting paths", () => {
    const args = [
      "/idf/components/esptool_py/esptool/esptool.py",
      "-p",
      "COM1",
      "write_flash",
      "--flash_mode",
      "dio",
      "--flash-size",
      "2MB",
      "partition_table.bin",
    ];
    assert.deepStrictEqual(formatEsptoolArgs(args, false), args);
    assert.deepStrictEqual(formatEsptoolArgs(args, true), [
      "/idf/components/esptool_py/esptool/esptool.py",
      "-p",
      "COM1",
      "write-flash",
      "--flash-mode",
      "dio",
      "--flash-size",
      "2MB",
      "partition_table.bin",
    ]);
  });

  test("keeps the esptool.py wrapper below esptool 5", () => {
    const scriptPath = "/idf/components/esptool_py/esptool/esptool.py";
    assert.deepStrictEqual(
      esptoolProgramArgs(scriptPath, esptoolUsesHyphenCli("4.8.1")),
      [scriptPath]
    );
  });

  test("uses python -m esptool from esptool 5.0.0", () => {
    const scriptPath = "/idf/components/esptool_py/esptool/esptool.py";
    assert.deepStrictEqual(
      esptoolProgramArgs(scriptPath, esptoolUsesHyphenCli("5.0.0")),
      ["-m", "esptool"]
    );
    assert.deepStrictEqual(
      esptoolProgramArgs(scriptPath, esptoolUsesHyphenCli("5.1.0")),
      ["-m", "esptool"]
    );
  });

  test("formats the subcommands this extension invokes", () => {
    for (const [underscore, hyphen] of [
      ["erase_flash", "erase-flash"],
      ["read_flash", "read-flash"],
      ["verify_flash", "verify-flash"],
      ["chip_id", "chip-id"],
    ] as const) {
      assert.strictEqual(formatEsptoolToken(underscore, false), underscore);
      assert.strictEqual(formatEsptoolToken(underscore, true), hyphen);
    }
  });
});
