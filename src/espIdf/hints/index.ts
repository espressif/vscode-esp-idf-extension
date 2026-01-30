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
import { Logger } from "../../logger/logger";
import * as utils from "../../utils";
import { getOpenOcdHintsYmlPath } from "./utils";
import * as vscode from "vscode";
import * as path from "path";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { configureEnvVariables } from "../../common/prepareEnv";

/**
 * Class representing a pair of regular expression and its corresponding hint.
 * Used to match error messages and provide helpful guidance.
 */
class ReHintPair {
  re: string; // Regular expression to match error messages
  hint: string; // Hint text to show when the regex matches
  match_to_output: boolean; // Whether to insert matched groups into the hint
  ref?: string; // Link to documentation for openOCD hints

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
      this.label = vscode.l10n.t(`🔗 Reference Documentation`);
      this.tooltip = vscode.l10n.t(`Open {0}`, label);
      this.command = {
        command: "vscode.open",
        title: vscode.l10n.t("Open Reference"),
        arguments: [vscode.Uri.parse(label)],
      };
      this.iconPath = new vscode.ThemeIcon("link-external");
    }
  }
}

export class ErrorHintProvider
  implements vscode.TreeDataProvider<ErrorHintTreeItem> {
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
      return Promise.resolve([
        ...this.buildErrorData,
        ...this.openocdErrorData,
      ]);
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
  public async searchError(
    errorMsg: string,
    workspace: vscode.Uri
  ): Promise<boolean> {
    this.buildErrorData = [];

    const modifiedEnv = await configureEnvVariables(workspace);
    const espIdfPath = modifiedEnv["IDF_PATH"];

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
    const toolsPath = modifiedEnv["IDF_TOOLS_PATH"];
    let openOcdHintsPath: string | null = null;
    try {
      const openOCDManager = OpenOCDManager.init();
      const openOCDVersion = await openOCDManager.version(true);
      if (toolsPath && openOCDVersion) {
        openOcdHintsPath = await getOpenOcdHintsYmlPath(workspace);
      } else {
        Logger.info(
          "Could not get toolsPath or OpenOCD version, skipping OpenOCD hints lookup.",
          "ErrorHintProvider searchError"
        );
      }
    } catch (error) {
      Logger.error(
        `Failed to initialize OpenOCDManager or get version: ${error.message}`,
        error,
        "ErrorHintProvider searchError"
      );
    }

    try {
      let meaningfulHintFound = false;

      // Process ESP-IDF hints
      if (await pathExists(idfHintsPath)) {
        try {
          const fileContents = await readFile(idfHintsPath, "utf-8");
          const hintsData = yaml.load(fileContents) as [];
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
      const mainPattern = hintPair.re.replace(/^.*?'(.*)'.*$/, "$1"); // Extract pattern between quotes if present
      if (mainPattern) {
        // Split by top-level pipes, preserving grouped expressions
        const parts = mainPattern.split(/\|(?![^(]*\))/);
        for (const part of parts) {
          // Clean up any remaining parentheses for direct string matching
          const cleaned = part.replace(/[()]/g, "");
          if (cleaned.length > 3) {
            // Avoid very short fragments
            regexParts.push(cleaned.toLowerCase());
          }
        }
      }
      if (
        match ||
        hintPair.re.toLowerCase().includes(errorMsg) ||
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
        const hint = new ErrorHintTreeItem(
          finalHint,
          "hint",
          hintChildren,
          hintPair.ref
        );

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
          const hint = new ErrorHintTreeItem(
            hintPair.hint,
            "hint",
            hintChildren,
            hintPair.ref
          );

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
      if (
        errorHint.label.toLowerCase().includes(errorMsg.toLowerCase()) &&
        errorHint.children.length > 0
      ) {
        const hintItem = errorHint.children[0];
        return {
          hint: hintItem.label.replace(/^💡 /, ""),
          ref: hintItem.reference,
        };
      }
    }

    // No match found
    return undefined;
  }

  public hasHints(): boolean {
    return this.buildErrorData.length > 0 || this.openocdErrorData.length > 0;
  }

  /**
   * Loads hints from the parsed YAML array and converts them to ReHintPair objects
   *
   * @param hintsArray - Array of hint definitions from YAML
   * @returns Array of ReHintPair objects ready for matching against error messages
   *
   * Example input:
   * [
   *   {
   *     re: "fatal error: (spiram.h|esp_spiram.h): No such file or directory",
   *     hint: "{} was removed. Include esp_psram.h instead.",
   *     match_to_output: true
   *   },
   *   {
   *     re: "error: implicit declaration of function '{}'",
   *     hint: "Function '{}' has been removed. Please use {}.",
   *     variables: [
   *       {
   *         re_variables: ["esp_random"],
   *         hint_variables: ["esp_random()", "esp_fill_random()"]
   *       }
   *     ]
   *   }
   * ]
   */
  loadHints(hintsArray: any[]): ReHintPair[] {
    let reHintsPairArray: ReHintPair[] = [];

    for (const entry of hintsArray) {
      // Case 1: Entry has variables
      if (entry.variables && entry.variables.length) {
        // Handle variable-based entries
        for (const variableSet of entry.variables) {
          const reVariables = variableSet.re_variables || [];
          const hintVariables = variableSet.hint_variables || [];

          let re = this.formatEntry(reVariables, entry.re);
          let hint = this.formatEntry(hintVariables, entry.hint);

          reHintsPairArray.push(
            new ReHintPair(re, hint, entry.match_to_output)
          );
        }
      } else {
        // Case 2: Simple entry without variables
        let re = String(entry.re);
        let hint = String(entry.hint);

        if (!entry.match_to_output) {
          // Simple case: no need to insert matched content into hint
          re = this.formatEntry([], re);
          hint = this.formatEntry([], hint);
          reHintsPairArray.push(new ReHintPair(re, hint, false));
        } else {
          // Complex case: need to expand alternatives and insert matches
          // E.g., "(spiram.h|esp_spiram.h)" should create two separate entries
          const reHintPairs = this.expandAlternatives(re, hint);
          for (const pair of reHintPairs) {
            reHintsPairArray.push(new ReHintPair(pair.re, pair.hint, true));
          }
        }
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

  /**
   * Formats an entry string by replacing {} placeholders with values from vars array
   *
   * @param vars - Array of values to insert into placeholders
   * @param entry - Template string with {} placeholders
   * @returns Formatted string with placeholders replaced by values
   *
   * Example:
   * formatEntry(["esp_random", "esp_fill_random"], "Function '{}' has been renamed to '{}'.")
   * Result: "Function 'esp_random' has been renamed to 'esp_fill_random'."
   */
  private formatEntry(vars: string[], entry: string): string {
    let i = 0;
    let formattedEntry = entry;

    // Replace {} with indexed placeholders {0}, {1}, etc.
    while (formattedEntry.includes("{}")) {
      formattedEntry = formattedEntry.replace("{}", "{" + i++ + "}");
    }

    // Replace indexed placeholders with values from vars array
    const result = formattedEntry.replace(
      /\{(\d+)\}/g,
      (_, idx) => vars[Number(idx)] || ""
    );

    return result;
  }

  /**
   * Expands regex patterns with alternatives into separate entries
   * This is critical for match_to_output: true cases where the match needs
   * to be inserted into the hint
   *
   * @param re - Regular expression string with possible alternatives in parentheses
   * @param hint - Hint template with {} placeholders for matches
   * @returns Array of {re, hint} pairs with alternatives expanded
   *
   * Example:
   * expandAlternatives(
   *   "fatal error: (spiram.h|esp_spiram.h): No such file or directory",
   *   "{} was removed. Include esp_psram.h instead."
   * )
   *
   * Results in:
   * [
   *   {
   *     re: "fatal error: spiram.h: No such file or directory",
   *     hint: "spiram.h was removed. Include esp_psram.h instead."
   *   },
   *   {
   *     re: "fatal error: esp_spiram.h: No such file or directory",
   *     hint: "esp_spiram.h was removed. Include esp_psram.h instead."
   *   }
   * ]
   */
  private expandAlternatives(
    re: string,
    hint: string
  ): Array<{ re: string; hint: string }> {
    const result: Array<{ re: string; hint: string }> = [];

    // Find all alternatives in parentheses with pipe characters
    // Example: in "(spiram.h|esp_spiram.h)" we'll find alternatives "spiram.h" and "esp_spiram.h"
    const alternativeMatches = re.match(/\(([^()]*\|[^()]*)\)/g);

    if (!alternativeMatches) {
      // No alternatives found, return the original as-is
      return [{ re, hint }];
    }

    // Process each alternative group
    for (const match of alternativeMatches) {
      const alternatives = match.slice(1, -1).split("|"); // Remove parens and split by pipe

      if (result.length === 0) {
        // Initial population of result
        for (const alt of alternatives) {
          const newRe = re.replace(match, alt);
          // For each alternative, create a new hint with the alternative inserted
          const newHint = hint.replace(/\{\}/, alt);
          result.push({ re: newRe, hint: newHint });
        }
      } else {
        // For subsequent alternative groups, multiply the existing results
        const currentResults = [...result];
        result.length = 0;

        for (const existingEntry of currentResults) {
          for (const alt of alternatives) {
            const newRe = existingEntry.re.replace(match, alt);
            // For each alternative, create a new hint with the alternative inserted
            const newHint = existingEntry.hint.replace(/\{\}/, alt);
            result.push({ re: newRe, hint: newHint });
          }
        }
      }
    }

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
