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
import {
  OutputCapturingPseudoterminal,
  sanitizeCapturedText,
} from "../../taskManager/outputCapturePseudoTerminal";
import {
  CapturedTaskOutput,
  TaskSuccessEpilogue,
} from "../../taskManager/types";

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

interface PseudoterminalRun {
  written: string;
  events: string[];
  output: CapturedTaskOutput | undefined;
}

function runPseudoterminal(
  script: string,
  epilogue?: TaskSuccessEpilogue
): Promise<PseudoterminalRun> {
  return new Promise<PseudoterminalRun>((resolve, reject) => {
    const run: PseudoterminalRun = {
      written: "",
      events: [],
      output: undefined,
    };
    const terminal = new OutputCapturingPseudoterminal(
      { file: process.execPath, args: ["-e", script] },
      (output) => {
        run.output = output;
      },
      reject,
      epilogue
    );
    terminal.onDidWrite((chunk) => {
      run.written += chunk;
      run.events.push(`write:${chunk}`);
    });
    terminal.onDidClose(() => {
      run.events.push("close");
      resolve(run);
    });
    terminal.open();
  });
}

suite("OutputCapturingPseudoterminal epilogue", () => {
  test("writes the epilogue to the terminal after a successful exit", async function () {
    this.timeout(20000);
    const run = await runPseudoterminal(
      "process.stdout.write('build done')",
      () => "To flash, run:\nidf.py flash"
    );
    assert.ok(run.written.includes("To flash, run:\r\nidf.py flash"));
    assert.ok(
      run.written.indexOf("build done") < run.written.indexOf("To flash, run:")
    );
    assert.strictEqual(run.events[run.events.length - 1], "close");
    assert.ok(run.events[run.events.length - 2].includes("To flash, run:"));
  });

  test("keeps the epilogue out of the captured output", async function () {
    this.timeout(20000);
    const run = await runPseudoterminal(
      "process.stdout.write('build done')",
      () => "To flash, run:\nidf.py flash"
    );
    assert.ok(run.output?.stdout.includes("build done"));
    assert.ok(!run.output?.stdout.includes("To flash, run:"));
    assert.ok(!run.output?.stderr.includes("To flash, run:"));
  });

  test("skips the epilogue when the process fails", async function () {
    this.timeout(20000);
    const run = await runPseudoterminal(
      "process.exit(3)",
      () => "To flash, run:\nidf.py flash"
    );
    assert.ok(!run.written.includes("To flash, run:"));
    assert.strictEqual(run.output?.exitCode, 3);
    assert.strictEqual(run.output?.success, false);
  });

  test("completes the task when the epilogue is empty", async function () {
    this.timeout(20000);
    const run = await runPseudoterminal(
      "process.stdout.write('build done')",
      () => ""
    );
    assert.strictEqual(run.events[run.events.length - 1], "close");
    assert.strictEqual(run.output?.success, true);
  });
});
