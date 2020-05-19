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
import { appendIdfAndToolsToPath, spawn } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import * as idfConf from "../idfConfiguration";

export interface countRange {
  range: vscode.Range;
  count: Number;
}

export interface textEditorWithCoverage {
  coveredLines: vscode.Range[];
  partialLines: vscode.Range[];
  uncoveredLines: vscode.Range[];
  editor: vscode.TextEditor;
  countPerLines: countRange[];
  allLines: vscode.Range[];
}

export async function buildJson(dirPath: string) {
  const idfPathDir =
    idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
  const componentsDir = join(idfPathDir, "components");
  const result = await _runCmd(
    "gcovr",
    [
      "--filter",
      ".",
      "--filter",
      componentsDir,
      "--gcov-executable",
      "xtensa-esp32-elf-gcov",
      "--json",
    ],
    dirPath
  );
  return JSON.parse(result);
}

export async function buildHtml(dirPath: string) {
  const idfPathDir =
    idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
  const componentsDir = join(idfPathDir, "components");
  const result = await _runCmd(
    "gcovr",
    [
      "--filter",
      ".",
      "--filter",
      componentsDir,
      "--gcov-executable",
      "xtensa-esp32-elf-gcov",
      "--html",
    ],
    dirPath
  );
  return result;
}

function _runCmd(cmd: string, args: string[], dirPath: string) {
  const modifiedEnv = appendIdfAndToolsToPath();
  return spawn(cmd, args, { env: modifiedEnv, cwd: dirPath })
    .then((resultBuffer) => resultBuffer.toString())
    .catch((e) => {
      const msg = e.message ? e.message : e;
      Logger.error("Error on gcov cmd.\n" + msg, e);
      OutputChannel.appendLine("Error building gcov cmd.\n" + msg);
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
      if (
        gcovFile.file === gcovObjFilePath ||
        gcovFile.file === editor.document.fileName
      ) {
        const coveredEditor: textEditorWithCoverage = {
          editor,
          coveredLines: [],
          partialLines: [],
          uncoveredLines: [],
          countPerLines: [],
          allLines: [],
        };

        for (let i = 0; i < editor.document.lineCount; i++) {
          coveredEditor.allLines.push(editor.document.lineAt(i).range);
        }

        for (let covLine of gcovFile.lines) {
          if (covLine && !covLine["gcovr/noncode"]) {
            const lineRange = editor.document.lineAt(covLine.line_number - 1)
              .range;

            const rangeToDelIndex = coveredEditor.allLines.findIndex((r) => {
              return r.isEqual(lineRange);
            });
            coveredEditor.allLines.splice(rangeToDelIndex, 1);

            if (covLine.count > 1) {
              coveredEditor.coveredLines.push(lineRange);
            } else if (covLine.count === 1) {
              coveredEditor.partialLines.push(lineRange);
            } else {
              coveredEditor.uncoveredLines.push(lineRange);
            }
            coveredEditor.countPerLines.push({
              range: lineRange,
              count: covLine.count,
            });
          }
        }
        coveredEditors.push(coveredEditor);
      }
    }
  }
  return coveredEditors;
}

export async function previewReport(dirPath: string) {
  try {
    const reportHtml = await buildHtml(dirPath);
    const previewPanel = vscode.window.createWebviewPanel(
      "gcoveragePreview",
      "Coverage report",
      vscode.ViewColumn.One
    );
    previewPanel.webview.html = reportHtml;
  } catch (e) {
    const msg = e.message ? e.message : e;
    Logger.error("Error building gcov html.\n" + msg, e);
    OutputChannel.appendLine("Error building gcov html.\n" + msg);
  }
}
