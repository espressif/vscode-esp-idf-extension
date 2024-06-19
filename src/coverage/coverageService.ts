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

import { basename, sep, join } from "path";
import * as vscode from "vscode";
import {
  extensionContext,
  getToolchainToolName,
  getWebViewFavicon,
} from "../utils";
import * as idfConf from "../idfConfiguration";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";
import { getGcovData } from "./gcdaPaths";
import { createGcovHtmlReport, createGcovReportObj } from "./gcovHtmlReport";

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

export function getGcovExecutable(idfTarget: string) {
  return getToolchainToolName(idfTarget, "gcov");
}

export async function generateCoverageForEditors(
  dirPath: vscode.Uri,
  editors: readonly vscode.TextEditor[],
  gcovJsonObj
) {
  const coveredEditors: textEditorWithCoverage[] = [];
  try {
    for (let editor of editors) {
      let gcovObjFilePath = "";
      if (editor.document.fileName.indexOf(dirPath.fsPath) > -1) {
        const fileParts = editor.document.fileName
          .replace(dirPath + sep, "")
          .split(sep);
        if (fileParts && fileParts.length > 1) {
          const fileName = fileParts.pop();
          const buildDirPath = idfConf.readParameter(
            "idf.buildPath",
            dirPath
          ) as string;
          gcovObjFilePath = join(
            buildDirPath,
            "esp-idf",
            fileParts[fileParts.length - 1],
            "CMakeFiles",
            `__idf_${fileParts[fileParts.length - 1]}.dir`,
            fileName
          ).replace(/\\/g, "/");
        }
      }

      for (const gcovData of gcovJsonObj) {
        for (const gcovFile of gcovData.files) {
          const gcovFilePath = basename(gcovFile.file) as string;
          if (
            gcovObjFilePath
              .toLowerCase()
              .indexOf(gcovFilePath.toLowerCase()) !== -1 ||
            editor.document.fileName
              .replace(/\\/g, "/")
              .toLowerCase()
              .indexOf(gcovFilePath.toLowerCase()) !== -1
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
                const lineRange = editor.document.lineAt(
                  covLine.line_number - 1
                ).range;

                const rangeToDelIndex = coveredEditor.allLines.findIndex(
                  (r) => {
                    return r.isEqual(lineRange);
                  }
                );
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
            break;
          }
        }
      }
    }
  } catch (error) {
    const msg = error.message ? error.message : error;
    Logger.error(
      "Error generate editor coverage.\n" +
        "Check the ESP-IDF output for more details." +
        msg,
      error
    );
    OutputChannel.appendLine(
      "Error generating editor coverage.\n" +
        "Review the code coverage tutorial https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/tutorial/code_coverage.md \n" +
        "or ESP-IDF documentation: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage \n" +
        msg
    );
  }
  return coveredEditors;
}

let gcovHtmlPanel: vscode.WebviewPanel;
export async function previewReport(dirPath: vscode.Uri) {
  try {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;
    if (gcovHtmlPanel) {
      gcovHtmlPanel.reveal(column);
      return;
    }
    const gcovObj = await getGcovData(dirPath);
    const reportHtml = createGcovHtmlReport(gcovObj);
    gcovHtmlPanel = vscode.window.createWebviewPanel(
      "gcoveragePreview",
      "GCC Code Coverage Report",
      column
    );
    gcovHtmlPanel.iconPath = getWebViewFavicon(extensionContext.extensionPath);
    gcovHtmlPanel.webview.html = reportHtml;
    gcovHtmlPanel.onDidDispose(() => (gcovHtmlPanel = undefined));
  } catch (e) {
    const msg = e && e.message ? e.message : e;
    Logger.errorNotify(
      "Error building gcov html.\n" +
        "Check the ESP-IDF output for more details.",
      e
    );
    OutputChannel.appendLine(
      "Error building gcov html.\n" +
        "Review the code coverage tutorial https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/tutorial/code_coverage.md \n" +
        "or ESP-IDF documentation: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage \n" +
        msg
    );
  }
}
