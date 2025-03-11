// Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import * as yaml from "js-yaml";
import { readFile, pathExists } from "fs-extra";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import * as utils from "../../utils";
import * as vscode from "vscode";
import * as path from "path";
import { OpenOCDManager } from "../openOcd/openOcdManager";

class ReHintPair {
  re: string;
  hint: string;
  match_to_output: boolean;
  ref?: string;

  constructor(
    re: string,
    hint: string,
    match_to_output: boolean = false,
    ref?: string
  ) {
    this.re = re;
    this.hint = hint;
    this.match_to_output = match_to_output;
    this.ref = ref;
  }
}

export class ErrorHintTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: "error" | "hint" | "reference",
    public readonly children: ErrorHintTreeItem[] = [],
    public readonly reference?: string
  ) {
    super(
      label,
      children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    // Set different appearances based on the type
    if (type === "error") {
      if (label.startsWith("No hints found")) {
        this.label = `⚠️ ${label}`;
      } else {
        this.label = `🔍 ${label}`;
      }
    } else if (type === "hint") {
      this.label = `💡 ${label}`;
      this.tooltip = label;
    } else if (type === "reference") {
      this.label =  vscode.l10n.t(`🔗 Reference Documentation`);
      this.tooltip = vscode.l10n.t(`Open {0}`, label);
      this.command = {
        command: 'vscode.open',
        title: 'Open Reference',
        arguments: [vscode.Uri.parse(label)]
      };
      this.iconPath = new vscode.ThemeIcon("link-external");
    }
  }
}

export class ErrorHintProvider implements vscode.TreeDataProvider<ErrorHintTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
  ErrorHintTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ErrorHintTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ErrorHintTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private buildErrorData: ErrorHintTreeItem[] = [];
  private openocdErrorData: ErrorHintTreeItem[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  // Get tree item for display
  getTreeItem(element: ErrorHintTreeItem): vscode.TreeItem {
    return element;
  }

  // Get children of a tree item
  getChildren(element?: ErrorHintTreeItem): Thenable<ErrorHintTreeItem[]> {
    if (element) {
      return Promise.resolve(element.children);
    } else {
      return Promise.resolve([...this.buildErrorData, ...this.openocdErrorData]);
    }
  }

  // Clear error hints
  clearErrorHints(clearOpenOCD: boolean = false): void {
    this.buildErrorData = [];
    if (clearOpenOCD) {
      this.openocdErrorData = [];
    }
    this._onDidChangeTreeData.fire();
  }

  // Clear only OpenOCD errors
  clearOpenOCDErrorsOnly(): void {
    this.openocdErrorData = [];
    this._onDidChangeTreeData.fire();
  }

  // Show OpenOCD error hint
  public async showOpenOCDErrorHint(
    errorMsg: string,
    hintMsg: string,
    reference?: string
  ): Promise<boolean> {
    try {
      this.openocdErrorData = [];
      
      // Create hint nodes
      const hintItems: ErrorHintTreeItem[] = [];
      
      // Add reference as a child if available
      if (reference) {
        hintItems.push(new ErrorHintTreeItem(reference, "reference"));
      }
      
      // Create hint with children
      const hint = new ErrorHintTreeItem(hintMsg, "hint", hintItems);
      
      // Create error with hint as child
      const error = new ErrorHintTreeItem(errorMsg, "error", [hint]);
      
      // Add to OpenOCD data array
      this.openocdErrorData.push(error);
      
      // Notify that the tree data has changed
      this._onDidChangeTreeData.fire();
      
      return true;
    } catch (error) {
      Logger.errorNotify(
        `Error showing OpenOCD error hint: ${error.message}`,
        error,
        "ErrorHintProvider showOpenOCDErrorHint"
      );
      return false;
    }
  }

  // Method to search for error hints
  public async searchError(errorMsg: string, workspace: vscode.Uri): Promise<boolean> {
    this.buildErrorData = [];
    
    const espIdfPath = idfConf.readParameter(
      "idf.espIdfPath",
      workspace
    ) as string;
    
    const version = await utils.getEspIdfFromCMake(espIdfPath);

    if (utils.compareVersion(version.trim(), "5.0") === -1) {
      this.buildErrorData.push(
        new ErrorHintTreeItem(
          `Error hints feature is not supported in ESP-IDF version ${version}`,
          "error"
        )
      );
      this._onDidChangeTreeData.fire();
      return false;
    }

    // Get paths for both hint files
    const idfHintsPath = getIdfHintsYmlPath(espIdfPath);
    const openOcdHintsPath = await getOpenOcdHintsYmlPath(workspace);

    try {
      let meaningfulHintFound = false;

      // Process ESP-IDF hints
      if (await pathExists(idfHintsPath)) {
        try {
          const fileContents = await readFile(idfHintsPath, "utf-8");
          const hintsData = yaml.load(fileContents);
          const reHintsPairArray: ReHintPair[] = this.loadHints(hintsData);

          meaningfulHintFound =
            (await this.processHints(errorMsg, reHintsPairArray)) ||
            meaningfulHintFound;
        } catch (error) {
          Logger.errorNotify(
            `Error processing ESP-IDF hints file (line ${error.mark?.line}): ${error.message}`,
            error,
            "ErrorHintProvider searchError"
          );
        }
      } else {
        Logger.infoNotify(`${idfHintsPath} does not exist.`);
      }

      // Process OpenOCD hints
      if (openOcdHintsPath && (await pathExists(openOcdHintsPath))) {
        try {
          const fileContents = await readFile(openOcdHintsPath, "utf-8");
          const hintsData = yaml.load(fileContents);
          const reHintsPairArray: ReHintPair[] = this.loadOpenOcdHints(
            hintsData
          );

          meaningfulHintFound =
            (await this.processHints(errorMsg, reHintsPairArray)) ||
            meaningfulHintFound;
        } catch (error) {
          Logger.errorNotify(
            `Error processing OpenOCD hints file (line ${error.mark?.line}): ${error.message}`,
            error,
            "ErrorHintProvider searchError"
          );
        }
      } else if (openOcdHintsPath) {
        Logger.info(`${openOcdHintsPath} does not exist.`);
      }

      if (this.buildErrorData.length === 0) {
        this.buildErrorData.push(
          new ErrorHintTreeItem(`No hints found for ${errorMsg}`, "error")
        );
      }

      this._onDidChangeTreeData.fire();
      return meaningfulHintFound;
    } catch (error) {
      Logger.errorNotify(
        `Error processing hints file: ${error.message}`,
        error,
        "ErrorHintProvider searchError"
      );
      return false;
    }
  }

  // Process hints
  private async processHints(
    errorMsg: string,
    reHintsPairArray: ReHintPair[]
  ): Promise<boolean> {
    let meaningfulHintFound = false;
    let errorFullMessage = "";
    
    for (const hintPair of reHintsPairArray) {
      const match = new RegExp(hintPair.re, "i").exec(errorMsg);
      const regexParts = [];
      // Extract meaningful parts from regex by breaking at top-level pipes
      // outside of parentheses or use a proper regex parser
      const mainPattern = hintPair.re.replace(/^.*?'(.*)'.*$/, '$1'); // Extract pattern between quotes if present
      if (mainPattern) {
        // Split by top-level pipes, preserving grouped expressions
        const parts = mainPattern.split(/\|(?![^(]*\))/);
        for (const part of parts) {
          // Clean up any remaining parentheses for direct string matching
          const cleaned = part.replace(/[()]/g, '');
          if (cleaned.length > 3) { // Avoid very short fragments
            regexParts.push(cleaned.toLowerCase());
          }
        }
      }
      if (
        match || hintPair.re.toLowerCase().includes(errorMsg) ||
        regexParts.some((part) => errorMsg.toLowerCase().includes(part))
      ) {
        let finalHint = hintPair.hint;
        
        if (match && hintPair.match_to_output && hintPair.hint.includes("{}")) {
          finalHint = hintPair.hint.replace("{}", match[0]);
        } else if (!match && hintPair.hint.includes("{}")) {
          const matchedSubstring = regexParts.find((part) =>
            errorMsg.toLowerCase().includes(part.toLowerCase())
          );
          finalHint = hintPair.hint.replace("{}", matchedSubstring || ""); // Handle case where nothing is matched
        }
        
        // Create hint children
        const hintChildren: ErrorHintTreeItem[] = [];
        
        // Add reference as child if available
        if (hintPair.ref) {
          hintChildren.push(new ErrorHintTreeItem(hintPair.ref, "reference"));
        }
        
        // Create hint with children
        const hint = new ErrorHintTreeItem(finalHint, "hint", hintChildren, hintPair.ref);
        
        // Create error with hint as child
        // Display matched error message 
        errorFullMessage = hintPair.re;
        const error = new ErrorHintTreeItem(errorFullMessage, "error", [hint]);
        
        // Add to build error data
        this.buildErrorData.push(error);

        if (!finalHint.startsWith("No hints found for")) {
          meaningfulHintFound = true;
        }
      }
    }

    // If no direct matches, try partial matches
    if (this.buildErrorData.length === 0) {
      for (const hintPair of reHintsPairArray) {
        if (hintPair.re.toLowerCase().includes(errorMsg.toLowerCase())) {
          // Create hint children
          const hintChildren: ErrorHintTreeItem[] = [];
          
          // Add reference as child if available
          if (hintPair.ref) {
            hintChildren.push(new ErrorHintTreeItem(hintPair.ref, "reference"));
          }
          
          // Create hint with children
          const hint = new ErrorHintTreeItem(hintPair.hint, "hint", hintChildren, hintPair.ref);
          
          // Create error with hint as child
          const error = new ErrorHintTreeItem(hintPair.re, "error", [hint]);
          
          // Add to build error data
          this.buildErrorData.push(error);

          if (!hintPair.hint.startsWith("No hints found for")) {
            meaningfulHintFound = true;
          }
        }
      }
    }

    return meaningfulHintFound;
  }

  // Get hint for an error message
  public getHintForError(
    errorMsg: string
  ): { hint?: string; ref?: string } | undefined {
    // Check in build errors
    for (const errorHint of this.buildErrorData) {
      if (errorHint.label === errorMsg && errorHint.children.length > 0) {
        const hintItem = errorHint.children[0];
        return {
          hint: hintItem.label.replace(/^💡 /, ''),
          ref: hintItem.reference
        };
      }
    }
    
    // Check in OpenOCD errors
    for (const errorHint of this.openocdErrorData) {
      if (errorHint.label === errorMsg && errorHint.children.length > 0) {
        const hintItem = errorHint.children[0];
        return {
          hint: hintItem.label.replace(/^💡 /, ''),
          ref: hintItem.reference
        };
      }
    }

    // No match found
    return undefined;
  }

  private loadHints(hintsArray: any): ReHintPair[] {
    let reHintsPairArray: ReHintPair[] = [];

    for (const entry of hintsArray) {
      if (entry.variables && entry.variables.length) {
        for (const variableSet of entry.variables) {
          const reVariables = variableSet.re_variables;
          const hintVariables = variableSet.hint_variables;

          let re = this.formatEntry(reVariables, entry.re);
          let hint = this.formatEntry(hintVariables, entry.hint);

          reHintsPairArray.push(
            new ReHintPair(re, hint, entry.match_to_output)
          );
        }
      } else {
        let re = String(entry.re);
        let hint = String(entry.hint);

        if (!entry.match_to_output) {
          re = this.formatEntry([], re);
          hint = this.formatEntry([], hint);
        }

        reHintsPairArray.push(new ReHintPair(re, hint, entry.match_to_output));
      }
    }

    return reHintsPairArray;
  }

  private loadOpenOcdHints(hintsArray: any): ReHintPair[] {
    let reHintsPairArray: ReHintPair[] = [];

    for (const entry of hintsArray) {
      // Ignore all properties that are not "re", "hint", "match_to_output", "variables" or "ref"
      if (entry.variables && entry.variables.length) {
        for (const variableSet of entry.variables) {
          const reVariables = variableSet.re_variables;
          const hintVariables = variableSet.hint_variables;

          let re = this.formatEntry(reVariables, entry.re);
          let hint = this.formatEntry(hintVariables, entry.hint);

          reHintsPairArray.push(
            new ReHintPair(re, hint, entry.match_to_output, entry.ref)
          );
        }
      } else {
        let re = String(entry.re);
        let hint = String(entry.hint);

        if (!entry.match_to_output) {
          re = this.formatEntry([], re);
          hint = this.formatEntry([], hint);
        }

        reHintsPairArray.push(
          new ReHintPair(re, hint, entry.match_to_output, entry.ref)
        );
      }
    }

    return reHintsPairArray;
  }

  private formatEntry(vars: string[], entry: string): string {
    let i = 0;
    while (entry.includes("{}")) {
      entry = entry.replace("{}", "{" + i++ + "}");
    }
    const result = entry.replace(
      /\{(\d+)\}/g,
      (_, idx) => vars[Number(idx)] || ""
    );
    return result;
  }
}

export class HintHoverProvider implements vscode.HoverProvider {
  constructor(private hintProvider: ErrorHintProvider) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Get all diagnostics for this document
    const diagnostics = vscode.languages
      .getDiagnostics(document.uri)
      .filter(
        (diagnostic) =>
          diagnostic.source === "esp-idf" &&
          diagnostic.severity === vscode.DiagnosticSeverity.Error
      );

    // No ESP-IDF diagnostics found for this document
    if (!diagnostics.length) {
      return null;
    }

    // Find diagnostics that contain the hover position
    for (const diagnostic of diagnostics) {
      // Check if position is within the diagnostic range
      // We'll be slightly more generous with the range to make it easier to hover
      const range = diagnostic.range;

      // Expand the range slightly to make it easier to hover
      const lineText = document.lineAt(range.start.line).text;
      const expandedRange = new vscode.Range(
        new vscode.Position(range.start.line, 0),
        new vscode.Position(range.end.line, lineText.length)
      );

      // Check if position is within the expanded range
      if (expandedRange.contains(position)) {
        // Get hint object for this error message
        const hintInfo = this.hintProvider.getHintForError(diagnostic.message);

        if (hintInfo && hintInfo.hint) {
          let hoverMessage = `**ESP-IDF Hint**: ${hintInfo.hint}`;

          // Add reference link if available
          if (hintInfo.ref) {
            hoverMessage += `\n\n[Reference Documentation](${hintInfo.ref})`;
          }
          // We found a hint, return it with markdown formatting
          return new vscode.Hover(new vscode.MarkdownString(`${hoverMessage}`));
        }
      }
    }

    // No matching diagnostics found at this position
    return null;
  }
}

function getIdfHintsYmlPath(espIdfPath: string): string {
  return path.join(espIdfPath, "tools", "idf_py_actions", "hints.yml");
}

async function getOpenOcdHintsYmlPath(
  workspace: vscode.Uri
): Promise<string | null> {
  try {
    const idfToolsPath = idfConf.readParameter(
      "idf.toolsPath",
      workspace
    ) as string;

    const openOCDManager = OpenOCDManager.init();
    const version = await openOCDManager.version();

    if (!version) {
      Logger.infoNotify(
        "Could not determine OpenOCD version. Hints file won't be loaded."
      );
      return null;
    }

    const hintsPath = path.join(
      idfToolsPath,
      "tools",
      "openocd-esp32",
      version,
      "openocd-esp32",
      "share",
      "openocd",
      "espressif",
      "tools",
      "esp_problems_hints.yml"
    );

    return hintsPath;
  } catch (error) {
    Logger.errorNotify(
      `Error getting OpenOCD hints path: ${error.message}`,
      error,
      "getOpenOcdHintsYmlPath"
    );
    return null;
  }
}
