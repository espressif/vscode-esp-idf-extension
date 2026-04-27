/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import {
  buildConfserverArgs,
  buildReconfigureArgs,
} from "../../espIdf/menuconfig/confserver/idfPyArgsBuilder";

suite("idfPyArgsBuilder", () => {
  test("buildConfserverArgs includes required command shape", () => {
    const args = buildConfserverArgs("/idf/tools/idf.py", {
      enableCCache: true,
      workspacePath: "/project",
      buildDirPath: "/project/build",
      sdkconfigFile: "/project/sdkconfig.custom",
      sdkconfigDefaults: ["defaults.a", "defaults.b"],
    });

    assert.deepStrictEqual(args, [
      "/idf/tools/idf.py",
      "--ccache",
      "-B",
      "/project/build",
      "-DSDKCONFIG=/project/sdkconfig.custom",
      "-DSDKCONFIG_DEFAULTS=defaults.a;defaults.b",
      "-C",
      "/project",
      "confserver",
    ]);
  });

  test("buildConfserverArgs omits optional flags when not provided", () => {
    const args = buildConfserverArgs("/idf.py", {
      enableCCache: false,
      workspacePath: "/project",
      buildDirPath: "/project/build",
      sdkconfigFile: "",
      sdkconfigDefaults: [],
    });
    assert.deepStrictEqual(args, [
      "/idf.py",
      "-B",
      "/project/build",
      "-C",
      "/project",
      "confserver",
    ]);
  });

  test("buildReconfigureArgs includes required command shape", () => {
    const args = buildReconfigureArgs("/idf/tools/idf.py", {
      enableCCache: true,
      workspacePath: "/project",
      sdkconfigFile: "/project/sdkconfig.custom",
      sdkconfigDefaults: ["defaults.a", "defaults.b"],
    });

    assert.deepStrictEqual(args, [
      "/idf/tools/idf.py",
      "--ccache",
      "-C",
      "/project",
      "-DSDKCONFIG=/project/sdkconfig.custom",
      "-DSDKCONFIG_DEFAULTS=defaults.a;defaults.b",
      "reconfigure",
    ]);
  });

  test("buildReconfigureArgs omits optional flags when not provided", () => {
    const args = buildReconfigureArgs("/idf.py", {
      enableCCache: false,
      workspacePath: "/project",
      sdkconfigFile: "",
      sdkconfigDefaults: [],
    });
    assert.deepStrictEqual(args, ["/idf.py", "-C", "/project", "reconfigure"]);
  });
});
