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
  resolveInitialColumns,
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

  test("removes Rich erase-character sequences without leaving X", () => {
    const raw = "│ Flash Code\u001b[1X│        48714 │\r\n";
    assert.strictEqual(
      sanitizeCapturedText(raw),
      "│ Flash Code │        48714 │\n"
    );
  });

  test("renders the requested number of erased terminal cells", () => {
    assert.strictEqual(sanitizeCapturedText("value\u001b[3X│"), "value   │");
  });

  test("bounds malformed erase-character counts", () => {
    assert.strictEqual(sanitizeCapturedText("\u001b[999999X").length, 1000);
  });

  test("removes Windows PTY title sequences and control characters", () => {
    const raw =
      "\u001b]0;C:\\Espressif\\python.exe\u0007Memory Type Usage Summary\u0007\r\n";
    assert.strictEqual(
      sanitizeCapturedText(raw),
      "Memory Type Usage Summary\n"
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

suite("resolveInitialColumns", () => {
  test("uses the configured width before VS Code supplies dimensions", () => {
    assert.strictEqual(resolveInitialColumns(undefined, 120), 120);
  });

  test("prefers the current terminal width", () => {
    assert.strictEqual(
      resolveInitialColumns({ columns: 96, rows: 24 }, 120),
      96
    );
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
  return new Promise<PseudoterminalRun>((resolve) => {
    const run: PseudoterminalRun = {
      written: "",
      events: [],
      output: undefined,
    };
    const terminal = new OutputCapturingPseudoterminal(
      {
        file: process.execPath,
        args: ["-e", script],
        // In the extension host process.execPath is VS Code's Electron binary,
        // which only evaluates the script when it runs as Node.
        env: { ELECTRON_RUN_AS_NODE: "1" },
      },
      (output) => {
        run.output = output;
      },
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
    assert.ok(run.written.includes("build done"));
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

suite("OutputCapturingPseudoterminal spawn failure", () => {
  test("resolves captured stderr with the spawn error instead of rejecting", async function () {
    this.timeout(20000);
    const missing =
      process.platform === "win32"
        ? "C:\\nonexistent\\esp-idf-sbom-missing.exe"
        : "/nonexistent/esp-idf-sbom-missing";
    const cwd = "/tmp/sbom-cwd";
    const run = await new Promise<PseudoterminalRun>((resolve) => {
      const result: PseudoterminalRun = {
        written: "",
        events: [],
        output: undefined,
      };
      const terminal = new OutputCapturingPseudoterminal(
        {
          file: missing,
          args: ["create"],
          cwd,
          env: {},
        },
        (output) => {
          result.output = output;
        }
      );
      terminal.onDidWrite((chunk) => {
        result.written += chunk;
        result.events.push(`write:${chunk}`);
      });
      terminal.onDidClose(() => {
        result.events.push("close");
        resolve(result);
      });
      terminal.open();
    });

    assert.strictEqual(run.output?.success, false);
    assert.ok(run.output?.stderr.includes(`File: ${missing}`));
    assert.ok(run.output?.stderr.includes("Args: create"));
    assert.ok(run.output?.stderr.includes(`Cwd: ${cwd}`));
    assert.ok(run.output?.stderr.includes("Error:"));
    assert.ok(run.written.includes(`File: ${missing}`));
    assert.ok(run.written.includes("Args: create"));
    assert.ok(run.written.includes(`Cwd: ${cwd}`));
    assert.ok(run.written.includes("Error:"));
    assert.notStrictEqual(run.output?.stderr, "");
    if (run.output?.spawnErrorCode) {
      assert.strictEqual(run.output.spawnErrorCode, "ENOENT");
    }
  });
});
