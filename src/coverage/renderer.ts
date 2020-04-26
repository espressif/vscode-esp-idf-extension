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
  generateCoverageForEditors,
  textEditorWithCoverage,
} from "./coverageService";

export interface CoverageOptions {
  darkThemeCoveredBackgroundColor: string;
  lightThemeCoveredBackgroundColor: string;
  darkThemeUncoveredBackgroundColor: string;
  lightThemeUncoveredBackgroundColor: string;
  overviewRuleLane: vscode.OverviewRulerLane;
}

export class CoverageRenderer {
  private coveredDecoratorType: vscode.TextEditorDecorationType;
  private notCoveredDecoratorType: vscode.TextEditorDecorationType;
  private workspaceFolder: vscode.Uri;

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
        options.overviewRuleLane || vscode.OverviewRulerLane.Right,
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
          options.overviewRuleLane || vscode.OverviewRulerLane.Right,
      }
    );
  }

  private setDecoratorsForEditor(editorsWithCov: textEditorWithCoverage[]) {
    for (const editor of editorsWithCov) {
      editor.editor.setDecorations(
        this.coveredDecoratorType,
        editor.coveredLines
      );
      editor.editor.setDecorations(
        this.notCoveredDecoratorType,
        editor.uncoveredLines
      );
    }
  }

  public async renderCoverage() {
    const editors = vscode.window.visibleTextEditors;
    if (editors && editors.length > 0) {
      const editorsWithCoverage = await generateCoverageForEditors(
        editors,
        this.workspaceFolder.fsPath
      );
      this.setDecoratorsForEditor(editorsWithCoverage);
    }
  }

  public removeCoverage() {
    const editors = vscode.window.visibleTextEditors;
    for (const editor of editors) {
      editor.setDecorations(this.coveredDecoratorType, []);
      editor.setDecorations(this.notCoveredDecoratorType, []);
    }
  }
}
