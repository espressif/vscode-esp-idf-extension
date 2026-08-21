/*
 * Project: ESP-IDF VSCode Extension
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
import { sanitizeCapturedText } from "../../taskManager/outputCapturePseudoTerminal";

suite("sanitizeCapturedText", () => {
  test("splits ninja progress lines rewritten with a lone carriage return", () => {
    const raw = "[4/517] Building a.c.obj\r[5/517] Building b.cpp.obj\r";
    assert.strictEqual(
      sanitizeCapturedText(raw),
      "[4/517] Building a.c.obj\n[5/517] Building b.cpp.obj\n"
    );
  });

  test("keeps CRLF as a single newline", () => {
    assert.strictEqual(
      sanitizeCapturedText("first\r\nsecond\r\n"),
      "first\nsecond\n"
    );
  });

  test("removes ANSI color sequences", () => {
    assert.strictEqual(sanitizeCapturedText("\u001b[32mok\u001b[0m"), "ok");
  });

  test("removes erase-in-line sequences emitted with progress updates", () => {
    assert.strictEqual(
      sanitizeCapturedText("[1/2] compiling\u001b[K\r[2/2] linking\u001b[K\r"),
      "[1/2] compiling\n[2/2] linking\n"
    );
  });

  test("leaves plain text untouched", () => {
    assert.strictEqual(
      sanitizeCapturedText("no control codes"),
      "no control codes"
    );
  });

  test("returns empty string for empty input", () => {
    assert.strictEqual(sanitizeCapturedText(""), "");
  });
});
