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

import * as vscode from "vscode";
import {
  buildJson,
  generateCoverageForEditors,
  textEditorWithCoverage,
} from "./coverageService";
import * as idfConf from "../idfConfiguration";

export interface CoverageOptions {
  darkThemeCoveredBackgroundColor: string;
  lightThemeCoveredBackgroundColor: string;
  darkThemePartialBackgroundColor: string;
  lightThemePartialBackgroundColor: string;
  darkThemeUncoveredBackgroundColor: string;
  lightThemeUncoveredBackgroundColor: string;
  overviewRuleLane: vscode.OverviewRulerLane;
}

export function getCoverageOptions() {
  const coverageOptions: CoverageOptions = {
    darkThemeCoveredBackgroundColor: idfConf.readParameter(
      "idf.coveredDarkTheme"
    ),
    darkThemeUncoveredBackgroundColor: idfConf.readParameter(
      "idf.uncoveredDarkTheme"
    ),
    darkThemePartialBackgroundColor: idfConf.readParameter(
      "idf.partialDarkTheme"
    ),
    lightThemeCoveredBackgroundColor: idfConf.readParameter(
      "idf.coveredLightTheme"
    ),
    lightThemePartialBackgroundColor: idfConf.readParameter(
      "idf.partialLightTheme"
    ),
    lightThemeUncoveredBackgroundColor: idfConf.readParameter(
      "idf.uncoveredLightTheme"
    ),
    overviewRuleLane: vscode.OverviewRulerLane.Right,
  };
  return coverageOptions;
}

export class CoverageRenderer {
  private cache: textEditorWithCoverage[];
  private countDecoratorTypes: vscode.TextEditorDecorationType[];
  private coverageWatcher: vscode.FileSystemWatcher;
  private coveredDecoratorType: vscode.TextEditorDecorationType;
  private editorEventListener: vscode.Disposable;
  private marginDecoratorType: vscode.TextEditorDecorationType;
  private notCoveredDecoratorType: vscode.TextEditorDecorationType;
  private partialDecoratorType: vscode.TextEditorDecorationType;
  private workspaceFolder: vscode.Uri;
  private gcovObj;

  constructor(workspaceFolder: vscode.Uri, options: CoverageOptions) {
    this.workspaceFolder = workspaceFolder;
    this.coveredDecoratorType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      dark: {
        backgroundColor:
          options.darkThemeCoveredBackgroundColor || "rgba(0,128,0,0.4)",
      },
      light: {
        backgroundColor:
          options.lightThemeCoveredBackgroundColor || "rgba(0,128,0,0.4)",
      },
      overviewRulerLane:
        options.overviewRuleLane || vscode.OverviewRulerLane.Left,
    });
    this.partialDecoratorType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      dark: {
        backgroundColor:
          options.darkThemePartialBackgroundColor || "rgba(250,218,94,0.1)",
      },
      light: {
        backgroundColor:
          options.lightThemePartialBackgroundColor || "rgba(250,218,94,0.1)",
      },
      overviewRulerLane:
        options.overviewRuleLane || vscode.OverviewRulerLane.Left,
    });
    this.notCoveredDecoratorType = vscode.window.createTextEditorDecorationType(
      {
        isWholeLine: true,
        dark: {
          backgroundColor:
            options.darkThemeUncoveredBackgroundColor || "rgba(255,0,0,0.1)",
        },
        light: {
          backgroundColor:
            options.lightThemeUncoveredBackgroundColor || "rgba(255,0,0,0.1)",
        },
        overviewRulerLane:
          options.overviewRuleLane || vscode.OverviewRulerLane.Left,
      }
    );
    this.marginDecoratorType = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: " ",
        margin: "0 3em 0 0",
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    });
    this.countDecoratorTypes = [];
    this.cache = [];
  }

  private setDecoratorsForEditor(editorsWithCov: textEditorWithCoverage[]) {
    for (const covEditor of editorsWithCov) {
      covEditor.editor.setDecorations(
        this.coveredDecoratorType,
        covEditor.coveredLines
      );
      covEditor.editor.setDecorations(
        this.partialDecoratorType,
        covEditor.partialLines
      );
      covEditor.editor.setDecorations(
        this.notCoveredDecoratorType,
        covEditor.uncoveredLines
      );
      covEditor.editor.setDecorations(
        this.marginDecoratorType,
        covEditor.allLines
      );
      covEditor.countPerLines.forEach((countRangePerLine) => {
        const decoratorType = vscode.window.createTextEditorDecorationType({
          before: {
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            contentText: countRangePerLine.count.toString(),
            margin: "0 3em 0 0",
            textDecoration: `none`,
          },
          rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
        });
        covEditor.editor.setDecorations(decoratorType, [
          countRangePerLine.range,
        ]);
        this.countDecoratorTypes.push(decoratorType);
      });
    }
  }

  public async renderCoverage() {
    const editors = vscode.window.visibleTextEditors;
    this.gcovObj = await buildJson(this.workspaceFolder);
    if (editors && editors.length > 0 && this.cache.length < 1) {
      const editorsWithCoverage = await generateCoverageForEditors(
        this.workspaceFolder.fsPath,
        editors,
        this.gcovObj
      );
      this.setDecoratorsForEditor(editorsWithCoverage);
      this.cache = editorsWithCoverage;
      this.listenToEditorEvent();
      this.listenToCovChanges();
    }
  }

  private async editorEventHandler(textEditors: vscode.TextEditor[]) {
    const editorsWithNoCoverage: vscode.TextEditor[] = [];
    const editorsInCache: textEditorWithCoverage[] = [];
    for (const textEditor of textEditors) {
      const editorInCache = this.cache.find(
        (editorWithCov) =>
          editorWithCov.editor.document.uri.fsPath ===
          textEditor.document.uri.fsPath
      );
      if (editorInCache) {
        editorInCache.editor = textEditor;
        editorsInCache.push(editorInCache);
      } else {
        editorsWithNoCoverage.push(textEditor);
      }
    }
    this.setDecoratorsForEditor(editorsInCache);
    const editorsWithCoverage = await generateCoverageForEditors(
      this.workspaceFolder.fsPath,
      editorsWithNoCoverage,
      this.gcovObj
    );
    this.cache.push(...editorsWithCoverage);
    this.setDecoratorsForEditor(editorsWithCoverage);
  }

  private listenToEditorEvent() {
    this.editorEventListener = vscode.window.onDidChangeVisibleTextEditors(
      this.editorEventHandler.bind(this)
    );
  }

  private listenToCovChanges() {
    this.coverageWatcher = vscode.workspace.createFileSystemWatcher(
      `**/*.{gcda,gcno}`
    );
    this.coverageWatcher.onDidChange(this.renderCoverage.bind(this));
    this.coverageWatcher.onDidCreate(this.renderCoverage.bind(this));
    this.coverageWatcher.onDidDelete(this.renderCoverage.bind(this));
  }

  public removeCoverage() {
    const editors = vscode.window.visibleTextEditors;
    for (const editor of editors) {
      editor.setDecorations(this.coveredDecoratorType, []);
      editor.setDecorations(this.notCoveredDecoratorType, []);
      editor.setDecorations(this.partialDecoratorType, []);
      while (this.countDecoratorTypes.length > 0) {
        const countDecorator = this.countDecoratorTypes.pop();
        editor.setDecorations(countDecorator, []);
        countDecorator.dispose();
      }
      editor.setDecorations(this.marginDecoratorType, []);
    }
    this.cache = [];
    this.coverageWatcher.dispose();
    this.editorEventListener.dispose();
  }

  public dispose() {
    this.coverageWatcher.dispose();
    this.coveredDecoratorType.dispose();
    this.editorEventListener.dispose();
    this.marginDecoratorType.dispose();
    this.notCoveredDecoratorType.dispose();
    this.partialDecoratorType.dispose();
  }
}
