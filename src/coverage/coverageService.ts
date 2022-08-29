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
import {
  appendIdfAndToolsToPath,
  dirExistPromise,
  extensionContext,
  getToolchainToolName,
  getWebViewFavicon,
  spawn,
} from "../utils";
import * as idfConf from "../idfConfiguration";
import { OutputChannel } from "../logger/outputChannel";
import { Logger } from "../logger/logger";

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

export async function getGcovFilterPaths(workspacePath: vscode.Uri) {
  const espAdfPath =
    idfConf.readParameter("idf.espAdfPath", workspacePath) ||
    process.env.ADF_PATH;
  const espIdfPath =
    idfConf.readParameter("idf.espIdfPath", workspacePath) ||
    process.env.IDF_PATH;
  const espMdfPath =
    idfConf.readParameter("idf.espMdfPath", workspacePath) ||
    process.env.MDF_PATH;

  const pathsToFilter: string[] = [];

  const idfExists = await dirExistPromise(espIdfPath);
  if (idfExists) {
    pathsToFilter.push(
      "--filter",
      join(espIdfPath, "components").replace(/\\/g, "/")
    );
  }
  const adfExists = await dirExistPromise(espAdfPath);
  if (adfExists) {
    pathsToFilter.push(
      "--filter",
      join(espAdfPath, "components").replace(/\\/g, "/")
    );
  }
  const mdfExists = await dirExistPromise(espMdfPath);
  if (mdfExists) {
    pathsToFilter.push(
      "--filter",
      join(espMdfPath, "components").replace(/\\/g, "/")
    );
  }
  return pathsToFilter;
}

export async function buildJson(dirPath: vscode.Uri) {
  const componentsDir = await getGcovFilterPaths(dirPath);
  const idfTarget =
    idfConf.readParameter("idf.adapterTargetName", dirPath) || "esp32";
  const gcovTool = getGcovExecutable(idfTarget);

  const result = await _runCmd(
    "gcovr",
    [
      "--filter",
      ".*",
      ...componentsDir,
      "--gcov-executable",
      gcovTool,
      "--json",
    ],
    dirPath.fsPath.replace(/\\/g, "/")
  );
  return JSON.parse(result);
}

export async function buildHtml(dirPath: vscode.Uri) {
  const componentsDir = await getGcovFilterPaths(dirPath);
  const idfTarget =
    idfConf.readParameter("idf.adapterTargetName", dirPath) || "esp32";
  const gcovTool = getGcovExecutable(idfTarget);
  const result = await _runCmd(
    "gcovr",
    [
      "--filter",
      ".",
      ...componentsDir,
      "--gcov-executable",
      gcovTool,
      "--html",
    ],
    dirPath.fsPath
  );
  return result;
}

function _runCmd(cmd: string, args: string[], dirPath: string) {
  const modifiedEnv = appendIdfAndToolsToPath(vscode.Uri.file(dirPath));
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
          const buildDirName = idfConf.readParameter(
            "idf.buildDirectoryName",
            dirPath
          ) as string;
          gcovObjFilePath = join(
            buildDirName,
            "esp-idf",
            fileParts[fileParts.length - 1],
            "CMakeFiles",
            `__idf_${fileParts[fileParts.length - 1]}.dir`,
            fileName
          ).replace(/\\/g, "/");
        }
      }

      for (const gcovFile of gcovJsonObj.files) {
        const gcovFilePath = gcovFile.file as string;
        if (
          gcovObjFilePath.toLowerCase().indexOf(gcovFilePath.toLowerCase()) !==
            -1 ||
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
          break;
        }
      }
    }
  } catch (error) {
    const msg = error.message ? error.message : error;
    Logger.error("Error generate editor coverage.\n" + msg, error);
    OutputChannel.appendLine("Error generating editor coverage.\n" + msg);
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
    const reportHtml = await buildHtml(dirPath);
    gcovHtmlPanel = vscode.window.createWebviewPanel(
      "gcoveragePreview",
      "Coverage report",
      column
    );
    gcovHtmlPanel.iconPath = getWebViewFavicon(extensionContext.extensionPath);
    gcovHtmlPanel.webview.html = reportHtml;
    gcovHtmlPanel.onDidDispose(() => (gcovHtmlPanel = undefined));
  } catch (e) {
    const msg = e.message ? e.message : e;
    Logger.error("Error building gcov html.\n" + msg, e);
    OutputChannel.appendLine("Error building gcov html.\n" + msg);
  }
}
