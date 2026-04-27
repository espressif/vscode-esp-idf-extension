/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import { parseConfserverJsonChunk } from "../../espIdf/menuconfig/confserver/streamJsonParser";

suite("confserverJsonStreamParser", () => {
  test("extracts a complete json message from one chunk", () => {
    const result = parseConfserverJsonChunk("", '{"version":2,"values":{}}\n');
    assert.strictEqual(result.latestJson, '{"version":2,"values":{}}');
    assert.strictEqual(result.remainingBuffer, "\n");
  });

  test("returns latest json when chunk has multiple messages", () => {
    const result = parseConfserverJsonChunk(
      "",
      '{"version":1}{"version":2,"values":{}}'
    );
    assert.strictEqual(result.latestJson, '{"version":2,"values":{}}');
    assert.strictEqual(result.remainingBuffer, "");
  });

  test("keeps incomplete json in remaining buffer", () => {
    const partial = parseConfserverJsonChunk("", 'prefix {"version":2');
    assert.strictEqual(partial.latestJson, undefined);
    assert.strictEqual(partial.remainingBuffer, '{"version":2');

    const completed = parseConfserverJsonChunk(
      partial.remainingBuffer,
      ',"values":{}}\n'
    );
    assert.strictEqual(completed.latestJson, '{"version":2,"values":{}}');
    assert.strictEqual(completed.remainingBuffer, "\n");
  });

  test("handles braces in json string values", () => {
    const result = parseConfserverJsonChunk(
      "",
      '{"text":"{not-a-brace}","values":{}}tail'
    );
    assert.strictEqual(result.latestJson, '{"text":"{not-a-brace}","values":{}}');
    assert.strictEqual(result.remainingBuffer, "tail");
  });
});
