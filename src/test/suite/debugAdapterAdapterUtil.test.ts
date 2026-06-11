/*
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { isHexString } from "../../debugAdapter/adapter/util/isHexString";
import { calculateMemoryOffset } from "../../debugAdapter/adapter/util/calculateMemoryOffset";

suite("debugAdapter adapter util isHexString", () => {
  test("accepts lowercase hex digits after 0x", () => {
    assert.strictEqual(isHexString("0xdeadbeef"), true);
  });

  test("accepts uppercase hex digits after 0x", () => {
    assert.strictEqual(isHexString("0xDEADBEEF"), true);
  });

  test("rejects missing 0x prefix", () => {
    assert.strictEqual(isHexString("deadbeef"), false);
  });

  test("rejects non-hex suffix", () => {
    assert.strictEqual(isHexString("0x00gg"), false);
  });

  test("rejects symbol-style names", () => {
    assert.strictEqual(isHexString("main+200"), false);
  });
});

suite("debugAdapter adapter util calculateMemoryOffset", () => {
  test("adds numeric offset to hex address preserving width", () => {
    assert.strictEqual(calculateMemoryOffset("0x10", 4), "0x14");
  });

  test("pads hex result to match original digit count", () => {
    assert.strictEqual(calculateMemoryOffset("0x0000ff00", 16), "0x0000ff10");
  });

  test("handles bigint offset for hex", () => {
    assert.strictEqual(calculateMemoryOffset("0x100", 1n), "0x101");
  });

  test("negative hex result uses wrapped format", () => {
    assert.strictEqual(calculateMemoryOffset("0x04", -8), "(0x00)-4");
  });

  test("appends offset to bare symbol", () => {
    assert.strictEqual(calculateMemoryOffset("main", 10), "main+10");
  });

  test("combines existing numeric suffix with offset", () => {
    assert.strictEqual(calculateMemoryOffset("main+200", 10), "main+210");
  });

  test("subtracts when combined offset is negative", () => {
    assert.strictEqual(calculateMemoryOffset("main+100", -150), "main-50");
  });
});
