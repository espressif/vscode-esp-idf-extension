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
import { resolve } from "path";
import * as vscode from "vscode";
import { handleError } from "../../common/error/handler";
import {
  childProcessFailed,
  known,
} from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { Logger } from "../../common/logger";
import { OutputChannel } from "../../common/outputChannel";
import { serialErrorPresentation } from "../../espIdf/serial/serialErrorPresentation";
import { createMockMemento } from "../mockUtils";

suite("handleError Output Channel", () => {
  const originalAppendLine = OutputChannel.appendLine;
  const originalAppendLineAndShow = OutputChannel.appendLineAndShow;
  const originalLoggerError = Logger.error.bind(Logger);
  const originalShowErrorMessage = vscode.window.showErrorMessage;
  let lines: { message: string; name?: string }[];

  suiteSetup(() => {
    const absPath = (filename: string) =>
      resolve(__dirname, "..", "..", "..", filename);
    Logger.init({
      extensionPath: resolve(__dirname, "..", "..", ".."),
      asAbsolutePath: absPath,
      workspaceState: createMockMemento(),
      globalState: createMockMemento(),
    } as vscode.ExtensionContext);
  });

  setup(() => {
    lines = [];
    OutputChannel.appendLine = (message: string, name?: string) => {
      lines.push({ message, name });
    };
    OutputChannel.appendLineAndShow = (message: string, name?: string) => {
      lines.push({ message, name });
    };
    Logger.error = () => undefined;
    Object.defineProperty(vscode.window, "showErrorMessage", {
      configurable: true,
      value: async () => undefined,
    });
  });

  teardown(() => {
    OutputChannel.appendLine = originalAppendLine;
    OutputChannel.appendLineAndShow = originalAppendLineAndShow;
    Logger.error = originalLoggerError;
    Object.defineProperty(vscode.window, "showErrorMessage", {
      configurable: true,
      value: originalShowErrorMessage,
    });
  });

  test("writes command line and captured streams for ChildProcessFailed", async () => {
    await handleError(
      "espIdf.detectSerialPort",
      childProcessFailed(
        {
          commandLine: "/usr/bin/python3 /idf/esptool.py chip_id",
          stdout: "",
          stderr: "A fatal error occurred: No serial ports found",
          exitCode: 2,
        },
        serialErrorPresentation.childProcessFailed
      )
    );

    assert.deepStrictEqual(
      lines.map((line) => line.message),
      [
        "Failed to detect the default serial port. Check the output for details.",
        "Command: /usr/bin/python3 /idf/esptool.py chip_id",
        "A fatal error occurred: No serial ports found",
      ]
    );
    assert.ok(lines.every((line) => line.name === "Serial port"));
  });

  test("does not dump process streams for TaskFailedWithOutput", async () => {
    await handleError(
      "espIdf.buildDevice",
      known(ErrorCode.TaskFailedWithOutput, {
        stdout: "ninja: error: missing file",
        stderr: "",
        exitCode: 1,
      }),
      undefined,
      { outputChannel: "Build" }
    );

    assert.deepStrictEqual(
      lines.map((line) => line.message),
      ["Build task failed. Check the terminal output for details."]
    );
  });
});
