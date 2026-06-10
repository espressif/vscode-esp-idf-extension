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

import {
  DecorationRangeBehavior,
  Disposable,
  FileSystemWatcher,
  OverviewRulerLane,
  TextEditor,
  TextEditorDecorationType,
  Uri,
  window,
  workspace
} from "vscode";
import {
  generateCoverageForEditors,
  textEditorWithCoverage,
} from "./coverageService";
import { readParameter } from "../configuration/idf";
import { getGcovData } from "./gcdaPaths";
import { IGcovOutput } from "./gcovData";

export interface CoverageOptions {
  darkThemeCoveredBackgroundColor: string;
  lightThemeCoveredBackgroundColor: string;
  darkThemePartialBackgroundColor: string;
  lightThemePartialBackgroundColor: string;
  darkThemeUncoveredBackgroundColor: string;
  lightThemeUncoveredBackgroundColor: string;
  overviewRuleLane: OverviewRulerLane;
}

export function getCoverageOptions(workspace: Uri) {
  const coverageOptions: CoverageOptions = {
    darkThemeCoveredBackgroundColor: readParameter(
      "idf.coveredDarkTheme",
      workspace
    ) as string,
    darkThemeUncoveredBackgroundColor: readParameter(
      "idf.uncoveredDarkTheme",
      workspace
    ) as string,
    darkThemePartialBackgroundColor: readParameter(
      "idf.partialDarkTheme",
      workspace
    ) as string,
    lightThemeCoveredBackgroundColor: readParameter(
      "idf.coveredLightTheme",
      workspace
    ) as string,
    lightThemePartialBackgroundColor: readParameter(
      "idf.partialLightTheme",
      workspace
    ) as string,
    lightThemeUncoveredBackgroundColor: readParameter(
      "idf.uncoveredLightTheme",
      workspace
    ) as string,
    overviewRuleLane: OverviewRulerLane.Right,
  };
  return coverageOptions;
}

export class CoverageRenderer {
  private cache: textEditorWithCoverage[];
  private countDecoratorTypes: TextEditorDecorationType[];
  private coverageWatcher?: FileSystemWatcher;
  private coveredDecoratorType: TextEditorDecorationType;
  private editorEventListener?: Disposable;
  private marginDecoratorType: TextEditorDecorationType;
  private notCoveredDecoratorType: TextEditorDecorationType;
  private partialDecoratorType: TextEditorDecorationType;
  private workspaceFolder: Uri;
  private gcovObj?: IGcovOutput[];

  constructor(workspaceFolder: Uri, options: CoverageOptions) {
    this.workspaceFolder = workspaceFolder;
    this.coveredDecoratorType = window.createTextEditorDecorationType({
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
        options.overviewRuleLane || OverviewRulerLane.Left,
    });
    this.partialDecoratorType = window.createTextEditorDecorationType({
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
        options.overviewRuleLane || OverviewRulerLane.Left,
    });
    this.notCoveredDecoratorType = window.createTextEditorDecorationType({
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
        options.overviewRuleLane || OverviewRulerLane.Left,
    });
    this.marginDecoratorType = window.createTextEditorDecorationType({
      before: {
        contentText: " ",
        margin: "0 3em 0 0",
      },
      rangeBehavior: DecorationRangeBehavior.ClosedOpen,
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
        const decoratorType = window.createTextEditorDecorationType({
          before: {
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            contentText: countRangePerLine.count.toString(),
            margin: "0 3em 0 0",
            textDecoration: `none`,
          },
          rangeBehavior: DecorationRangeBehavior.ClosedOpen,
        });
        covEditor.editor.setDecorations(decoratorType, [
          countRangePerLine.range,
        ]);
        this.countDecoratorTypes.push(decoratorType);
      });
    }
  }

  public async renderCoverage() {
    const editors = window.visibleTextEditors;
    this.gcovObj = await getGcovData(this.workspaceFolder);
    if (editors && editors.length > 0 && this.cache.length < 1) {
      const editorsWithCoverage = await generateCoverageForEditors(
        this.workspaceFolder,
        editors,
        this.gcovObj
      );
      this.setDecoratorsForEditor(editorsWithCoverage);
      this.cache = editorsWithCoverage;
      this.listenToEditorEvent();
      this.listenToCovChanges();
    }
  }

  private async editorEventHandler(textEditors: readonly TextEditor[]) {
    const editorsWithNoCoverage: TextEditor[] = [];
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
    if (this.gcovObj) {
      const editorsWithCoverage = await generateCoverageForEditors(
        this.workspaceFolder,
        editorsWithNoCoverage,
        this.gcovObj
      );
      this.cache.push(...editorsWithCoverage);
      this.setDecoratorsForEditor(editorsWithCoverage);
    }
  }

  private listenToEditorEvent() {
    this.editorEventListener = window.onDidChangeVisibleTextEditors(
      this.editorEventHandler.bind(this)
    );
  }

  private listenToCovChanges() {
    this.coverageWatcher = workspace.createFileSystemWatcher(
      `**/*.{gcda,gcno}`
    );
    this.coverageWatcher.onDidChange(this.renderCoverage.bind(this));
    this.coverageWatcher.onDidCreate(this.renderCoverage.bind(this));
    this.coverageWatcher.onDidDelete(this.renderCoverage.bind(this));
  }

  public removeCoverage() {
    const editors = window.visibleTextEditors;
    for (const editor of editors) {
      editor.setDecorations(this.coveredDecoratorType, []);
      editor.setDecorations(this.notCoveredDecoratorType, []);
      editor.setDecorations(this.partialDecoratorType, []);
      while (this.countDecoratorTypes.length > 0) {
        const countDecorator = this.countDecoratorTypes.pop();
        if (countDecorator) {
          editor.setDecorations(countDecorator, []);
          countDecorator.dispose();
        }
      }
      editor.setDecorations(this.marginDecoratorType, []);
    }
    this.cache = [];
    if (this.coverageWatcher) {
      this.coverageWatcher.dispose();
    }
    if (this.editorEventListener) {
      this.editorEventListener.dispose();
    }
  }

  public dispose() {
    this.coverageWatcher?.dispose();
    this.coveredDecoratorType.dispose();
    this.editorEventListener?.dispose();
    this.marginDecoratorType.dispose();
    this.notCoveredDecoratorType.dispose();
    this.partialDecoratorType.dispose();
  }
}
