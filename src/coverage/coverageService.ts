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

import { sep, join } from "path";
import * as vscode from "vscode";
import { appendIdfAndToolsToPath, spawn } from "../utils";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import * as idfConf from "../idfConfiguration";

const COVERED_FACTOR = 0.9;
const PARTIAL_FACTOR = 0.75;
const MIN_LINE_COUNT = 1;

export interface countRange {
  range: vscode.Range;
  count: Number;
}

export interface textEditorWithCoverage {
  allLines: vscode.Range[];
  countPerLines: countRange[];
  coveredLines: vscode.Range[];
  editor: vscode.TextEditor;
  partialLines: vscode.Range[];
  uncoveredLines: vscode.Range[];
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
      const msg = e.error ? e.error.message : e;
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
    let gcovObjFilePath = "";
    if (editor.document.fileName.indexOf(dirPath) > -1) {
      const fileParts = editor.document.fileName
        .replace(dirPath + sep, "")
        .split(sep);
      const fileName = fileParts.pop();
      gcovObjFilePath = join(
        "build",
        "esp-idf",
        fileParts[fileParts.length - 1],
        "CMakeFiles",
        `__idf_${fileParts[fileParts.length - 1]}.dir`,
        fileName
      );
    }

    for (const gcovFile of gcovObj.files) {
      if (
        gcovFile.file === gcovObjFilePath ||
        gcovFile.file === editor.document.fileName
      ) {
        const coveredEditor: textEditorWithCoverage = {
          allLines: [],
          countPerLines: [],
          coveredLines: [],
          editor,
          partialLines: [],
          uncoveredLines: [],
        };

        for (let i = 0; i < editor.document.lineCount; i++) {
          coveredEditor.allLines.push(editor.document.lineAt(i).range);
        }

        const maxLineCount =
          gcovFile.lines.reduce((prev, curr) => {
            return prev < curr.count ? curr.count : prev;
          }, 0) || MIN_LINE_COUNT;

        const coveredLineCount =
          Math.round(maxLineCount * COVERED_FACTOR) || MIN_LINE_COUNT;
        const partialLineCount =
          Math.floor(maxLineCount * PARTIAL_FACTOR) || MIN_LINE_COUNT;

        for (let covLine of gcovFile.lines) {
          if (covLine && !covLine["gcovr/noncode"]) {
            const lineRange = editor.document.lineAt(covLine.line_number - 1)
              .range;

            const rangeToDelIndex = coveredEditor.allLines.findIndex((r) => {
              return r.isEqual(lineRange);
            });
            coveredEditor.allLines.splice(rangeToDelIndex, 1);

            if (covLine.count >= coveredLineCount) {
              coveredEditor.coveredLines.push(lineRange);
            } else if (
              partialLineCount <= covLine.count &&
              covLine.count < coveredLineCount
            ) {
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

let gcovHtmlPanel: vscode.WebviewPanel;
export async function previewReport(dirPath: string) {
  try {
    if (gcovHtmlPanel) {
      return;
    }
    const reportHtml = await buildHtml(dirPath);
    gcovHtmlPanel = vscode.window.createWebviewPanel(
      "gcoveragePreview",
      "Coverage report",
      vscode.ViewColumn.One
    );
    gcovHtmlPanel.webview.html = reportHtml;
    gcovHtmlPanel.onDidDispose(() => (gcovHtmlPanel = undefined));
  } catch (e) {
    const msg = e.message ? e.message : e;
    Logger.error("Error building gcov html.\n" + msg, e);
    OutputChannel.appendLine("Error building gcov html.\n" + msg);
  }
}
