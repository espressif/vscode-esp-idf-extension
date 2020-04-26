// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { basename, join } from "path";
import * as vscode from "vscode";
import { appendIdfAndToolsToPath, execChildProcess } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";

export interface textEditorWithCoverage {
  coveredLines: vscode.Range[];
  uncoveredLines: vscode.Range[];
  editor: vscode.TextEditor;
}

export async function buildJson(dirPath: string) {
  const result = await _runCmd(
    "gcovr",
    ["-r", ".", "--gcov-executable", "xtensa-esp32-elf-gcov", "--json"],
    dirPath
  );
  return JSON.parse(result);
}

export async function buildHtml(dirPath: string) {
  const result = await _runCmd(
    "gcovr",
    ["-r", ".", "--gcov-executable", "xtensa-esp32-elf-gcov", "--html"],
    dirPath
  );
  return result;
}

function _runCmd(cmd: string, args: string[], dirPath: string) {
  const modifiedEnv = appendIdfAndToolsToPath();
  console.log(`${cmd} ${args.join(" ")}`);
  return execChildProcess(
    `${cmd} ${args.join(" ")}`,
    dirPath,
    OutputChannel.init(),
    { env: modifiedEnv, cwd: dirPath }
  ).catch((e) => {
    Logger.error("Error on gcov cmd", e);
    return "";
  });
}

export async function generateCoverageForEditors(
  editors: vscode.TextEditor[],
  dirPath: string
) {
  const gcovObj = await buildJson(dirPath);
  const coveredEditors: textEditorWithCoverage[] = [];
  for (let editor of editors) {
    const filename = basename(editor.document.fileName);
    const gcovObjFilePath = join(
      "build",
      "esp-idf",
      "main",
      "CMakeFiles",
      "__idf_main.dir",
      filename
    );

    for (const gcovFile of gcovObj.files) {
      if (gcovFile.file === gcovObjFilePath) {
        const coveredEditor: textEditorWithCoverage = {
          editor,
          coveredLines: [],
          uncoveredLines: [],
        };
        for (let covLine of gcovFile.lines) {
          if (covLine && covLine.count > 0) {
            const lineRange = editor.document.lineAt(covLine.line_number - 1)
              .range;
            if (covLine.branches.length === 0) {
              coveredEditor.coveredLines.push(lineRange);
            } else {
              coveredEditor.uncoveredLines.push(lineRange);
            }
          }
        }
        coveredEditors.push(coveredEditor);
      }
    }
  }
  return coveredEditors;
}
