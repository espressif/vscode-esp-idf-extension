/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { isJtagEraseFlashResponseSuccess } from "../../eraseFlash/transports/jtag/eraseFlashJtagResponse";
import { buildUartEraseFlashArgs } from "../../eraseFlash/transports/uart/eraseFlashUartArgs";

suite("eraseFlash", () => {
  suite("isJtagEraseFlashResponseSuccess", () => {
    test("treats empty response as success", () => {
      assert.strictEqual(isJtagEraseFlashResponseSuccess(""), true);
    });

    test("succeeds when response contains erased sectors marker", () => {
      assert.strictEqual(
        isJtagEraseFlashResponseSuccess("erased sectors 0 10"),
        true
      );
      assert.strictEqual(
        isJtagEraseFlashResponseSuccess("prefix erased sectors 0 1 suffix"),
        true
      );
    });

    test("fails when response is non-empty and has no marker", () => {
      assert.strictEqual(isJtagEraseFlashResponseSuccess("error"), false);
      assert.strictEqual(isJtagEraseFlashResponseSuccess("unknown"), false);
      assert.strictEqual(
        isJtagEraseFlashResponseSuccess("erased but wrong phrase"),
        false
      );
    });
  });

  suite("buildUartEraseFlashArgs", () => {
    test("builds esptool erase_flash argv", () => {
      assert.deepStrictEqual(
        buildUartEraseFlashArgs("/idf/components/esptool_py/esptool/esptool.py", "COM1"),
        [
          "/idf/components/esptool_py/esptool/esptool.py",
          "-p",
          "COM1",
          "erase_flash",
        ]
      );
    });
  });
});
