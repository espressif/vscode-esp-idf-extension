/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import {
  PYTHON_PACKAGE_VERSION_SNIPPETS,
  clearPythonPackageVersionCache,
  getPythonPackageVersion,
  normalizePythonPackageVersion,
} from "../../python/packageVersion";
import { sanitizeSpawnInvocation } from "../../utils";

suite("python package version", () => {
  setup(() => {
    clearPythonPackageVersionCache();
  });

  suite("normalizePythonPackageVersion", () => {
    test("trims a printed version", () => {
      assert.strictEqual(normalizePythonPackageVersion("4.8.1\n"), "4.8.1");
    });

    test("drops a local version suffix", () => {
      assert.strictEqual(
        normalizePythonPackageVersion("5.0.2+esp.1\n"),
        "5.0.2"
      );
    });

    test("uses the last non-empty line", () => {
      assert.strictEqual(
        normalizePythonPackageVersion("warning from stderr\n5.1.0\n"),
        "5.1.0"
      );
    });

    test("rejects empty output", () => {
      assert.throws(() => normalizePythonPackageVersion(" \n"));
    });
  });

  suite("version snippets", () => {
    test("are single-line arguments accepted by spawn sanitization", () => {
      for (const snippet of PYTHON_PACKAGE_VERSION_SNIPPETS) {
        assert.strictEqual(snippet.includes("\n"), false);
        assert.doesNotThrow(() =>
          sanitizeSpawnInvocation("python3", ["-c", snippet, "esptool"])
        );
      }
    });
  });

  suite("getPythonPackageVersion", () => {
    test("rejects a package name before spawning Python", async () => {
      await assert.rejects(
        () => getPythonPackageVersion("esptool;id", "/usr/bin/python3"),
        /Invalid Python package name/
      );
    });

    test("rejects an empty Python path before reading a package", async () => {
      await assert.rejects(() => getPythonPackageVersion("esptool", ""));
    });
  });
});
