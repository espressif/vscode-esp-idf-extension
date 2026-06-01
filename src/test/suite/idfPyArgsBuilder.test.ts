/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { Uri } from "vscode";
import { buildIdfPyConfigSubcommandArgs } from "../../espIdf/common/idfPySubCmdBuilder";

suite("buildIdfPyConfigSubcommandArgs", () => {
  test("buildIdfPyConfigSubcommandArgs includes required command shape", () => {
    const args = buildIdfPyConfigSubcommandArgs(
      "/idf/tools/idf.py",
      "confserver",
      Uri.parse("/project"),
      true,
      "/project/build",
      "/project/sdkconfig.custom",
      ["defaults.a", "defaults.b"]
    );

    assert.deepStrictEqual(args, [
      "/idf/tools/idf.py",
      "-B",
      "/project/build",
      "-DSDKCONFIG=/project/sdkconfig.custom",
      "-DSDKCONFIG_DEFAULTS=defaults.a;defaults.b",
      "-DCCACHE_ENABLE=1",
      "-C",
      "/project",
      "confserver",
    ]);
  });

  test("buildIdfPyConfigSubcommandArgs omits optional flags when not provided", () => {
    const args = buildIdfPyConfigSubcommandArgs(
      "/idf.py",
      "confserver",
      Uri.parse("/project"),
      false,
      "/project/build",
      "",
      []
    );
    assert.deepStrictEqual(args, [
      "/idf.py",
      "-B",
      "/project/build",
      "-C",
      "/project",
      "confserver",
    ]);
  });

  test("buildIdfPyConfigSubcommandArgs includes required command shape", () => {
    const args = buildIdfPyConfigSubcommandArgs(
      "/idf/tools/idf.py",
      "reconfigure",
      Uri.parse("/project"),
      true,
      "/project/build",
      "/project/sdkconfig.custom",
      ["defaults.a", "defaults.b"]
    );

    assert.deepStrictEqual(args, [
      "/idf/tools/idf.py",
      "-B",
      "/project/build",
      "-DSDKCONFIG=/project/sdkconfig.custom",
      "-DSDKCONFIG_DEFAULTS=defaults.a;defaults.b",
      "-DCCACHE_ENABLE=1",
      "-C",
      "/project",
      "reconfigure",
    ]);
  });

  test("buildIdfPyConfigSubcommandArgs omits optional flags when not provided", () => {
    const args = buildIdfPyConfigSubcommandArgs(
      "/idf.py",
      "reconfigure",
      Uri.parse("/project"),
      false,
      "/project/build",
      "",
      []
    );
    assert.deepStrictEqual(args, [
      "/idf.py",
      "-B",
      "/project/build",
      "-C",
      "/project",
      "reconfigure",
    ]);
  });
});
