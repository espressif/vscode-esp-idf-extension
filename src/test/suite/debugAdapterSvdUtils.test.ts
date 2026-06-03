/*
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { AddrRange } from "../../debugAdapter/svd/common";
import {
  binaryFormat,
  cleanupDescription,
  createMask,
  extractBits,
  hexFormat,
  parseDimIndex,
  parseInteger,
  splitIntoChunks,
} from "../../debugAdapter/svd/utils";

suite("debugAdapter svd utils parseInteger", () => {
  test("parses binary with 0b prefix", () => {
    assert.strictEqual(parseInteger("0b1010"), 10);
  });

  test("parses hex with 0x prefix", () => {
    assert.strictEqual(parseInteger("0xff"), 255);
  });

  test("parses decimal", () => {
    assert.strictEqual(parseInteger("42"), 42);
  });

  test("parses binary with # prefix", () => {
    assert.strictEqual(parseInteger("#101"), 5);
  });

  test("returns undefined for invalid input", () => {
    assert.strictEqual(parseInteger("not-a-number"), undefined);
  });
});

suite("debugAdapter svd utils hexFormat and binaryFormat", () => {
  test("hexFormat pads and adds prefix by default", () => {
    assert.strictEqual(hexFormat(0xab, 4), "0x00ab");
  });

  test("hexFormat can omit prefix", () => {
    assert.strictEqual(hexFormat(15, 2, false), "0f");
  });

  test("binaryFormat pads to requested width", () => {
    assert.strictEqual(binaryFormat(3, 8, true, false), "0b00000011");
  });
});

suite("debugAdapter svd utils createMask and extractBits", () => {
  test("extractBits reads low byte", () => {
    assert.strictEqual(extractBits(0xff00, 8, 8), 0xff);
  });

  test("createMask covers bit range (width bits from offset)", () => {
    assert.strictEqual(createMask(0, 3), 0b111);
    assert.strictEqual(createMask(0, 4), 0b1111);
  });
});

suite("debugAdapter svd utils cleanupDescription", () => {
  test("normalizes newlines to single spaces", () => {
    assert.strictEqual(
      cleanupDescription("line1\r\n  line2"),
      "line1 line2"
    );
  });
});

suite("debugAdapter svd utils parseDimIndex", () => {
  test("splits comma-separated list when count matches", () => {
    assert.deepStrictEqual(parseDimIndex("a, b, c", 3), ["a", "b", "c"]);
  });

  test("expands numeric range", () => {
    assert.deepStrictEqual(parseDimIndex("0-2", 3), ["0", "1", "2"]);
  });

  test("expands letter range", () => {
    assert.deepStrictEqual(parseDimIndex("A-C", 3), ["A", "B", "C"]);
  });

  test("throws when comma list length mismatches count", () => {
    assert.throws(
      () => parseDimIndex("a,b", 3),
      /invalid specification/
    );
  });

  test("throws when numeric range has fewer elements than count", () => {
    assert.throws(
      () => parseDimIndex("0-1", 3),
      /invalid specification/
    );
  });
});

suite("debugAdapter svd utils splitIntoChunks", () => {
  test("splits a range larger than maxBytes", () => {
    const ranges = splitIntoChunks([new AddrRange(0x1000, 10 * 1024)], 4 * 1024);
    assert.strictEqual(ranges.length, 3);
    assert.strictEqual(ranges[0].length, 4 * 1024);
    assert.strictEqual(ranges[1].length, 4 * 1024);
    assert.strictEqual(ranges[2].length, 2 * 1024);
    assert.strictEqual(ranges[0].base, 0x1000);
    assert.strictEqual(ranges[1].base, 0x1000 + 4 * 1024);
  });

  test("passes through ranges smaller than maxBytes", () => {
    const ranges = splitIntoChunks([new AddrRange(0, 100)], 1024);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].base, 0);
    assert.strictEqual(ranges[0].length, 100);
  });
});
