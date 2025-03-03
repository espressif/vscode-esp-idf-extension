import * as os from "os";
import * as yaml from "js-yaml";
import { readFile, pathExists } from "fs-extra";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import * as utils from "../../utils";
import * as vscode from "vscode";

class ReHintPair {
  re: string;
  hint: string;
  match_to_output: boolean;

  constructor(re: string, hint: string, match_to_output: boolean = false) {
    this.re = re;
    this.hint = hint;
    this.match_to_output = match_to_output;
  }
}

class ErrorHint {
  public type: "error" | "hint";
  public children: ErrorHint[] = [];

  constructor(public label: string, type: "error" | "hint") {
    this.type = type;
  }

  addChild(child: ErrorHint) {
    this.children.push(child);
  }
}

export class ErrorHintProvider implements vscode.TreeDataProvider<ErrorHint> {
  constructor(private context: vscode.ExtensionContext) {}
  private _onDidChangeTreeData: vscode.EventEmitter<
    ErrorHint | undefined | null | void
  > = new vscode.EventEmitter<ErrorHint | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ErrorHint | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private data: ErrorHint[] = [];

  public getHintForError(errorMsg: string): string | undefined {
    // First try exact match
    for (const errorHint of this.data) {
      if (errorHint.label === errorMsg && errorHint.children.length > 0) {
        return errorHint.children[0].label;
      }
    }
    
    // Then try partial match
    for (const errorHint of this.data) {
      // Normalize strings for comparison (trim, lowercase)
      const normalizedLabel = errorHint.label.trim().toLowerCase();
      const normalizedError = errorMsg.trim().toLowerCase();
      
      // Check if error message is contained in the label or vice versa
      if ((normalizedLabel.includes(normalizedError) || 
          normalizedError.includes(normalizedLabel)) && 
          errorHint.children.length > 0) {
        return errorHint.children[0].label;
      }
    }
    
    // No match found
    return undefined;
  }

  async searchError(errorMsg: string, workspace): Promise<boolean> {
    const espIdfPath = idfConf.readParameter(
      "idf.espIdfPath",
      workspace
    ) as string;
    const version = await utils.getEspIdfFromCMake(espIdfPath);

    if (utils.compareVersion(version.trim(), "5.0") === -1) {
      this.data.push(
        new ErrorHint(
          `Error hints feature is not supported in ESP-IDF version ${version}`,
          "error"
        )
      );
      this._onDidChangeTreeData.fire();
      return false;
    }

    const hintsPath = getHintsYmlPath(espIdfPath);

    try {
      if (!(await pathExists(hintsPath))) {
        Logger.infoNotify(`${hintsPath} does not exist.`);
        return false;
      }

      const fileContents = await readFile(hintsPath, "utf-8");
      const hintsData = yaml.load(fileContents);

      const reHintsPairArray: ReHintPair[] = this.loadHints(hintsData);

      this.data = [];
      let meaningfulHintFound = false;
      for (const hintPair of reHintsPairArray) {
        const match = new RegExp(hintPair.re, "i").exec(errorMsg);
        const regexParts = Array.from(hintPair.re.matchAll(/\(([^)]+)\)/g))
          .map((m) => m[1].split("|"))
          .flat()
          .map((part) => part.toLowerCase());
        if (
          match ||
          regexParts.some((part) => errorMsg.toLowerCase().includes(part))
        ) {
          let finalHint = hintPair.hint;
          if (
            match &&
            hintPair.match_to_output &&
            hintPair.hint.includes("{}")
          ) {
            finalHint = hintPair.hint.replace("{}", match[0]);
          } else if (!match && hintPair.hint.includes("{}")) {
            const matchedSubstring = regexParts.find((part) =>
              errorMsg.toLowerCase().includes(part.toLowerCase())
            );
            finalHint = hintPair.hint.replace("{}", matchedSubstring || ""); // Handle case where nothing is matched
          }
          const error = new ErrorHint(errorMsg, "error");
          const hint = new ErrorHint(finalHint, "hint");
          error.addChild(hint);
          this.data.push(error);

          if (!finalHint.startsWith("No hints found for")) {
            meaningfulHintFound = true;
          }
        }
      }

      if (this.data.length === 0) {
        for (const hintPair of reHintsPairArray) {
          if (hintPair.re.toLowerCase().includes(errorMsg.toLowerCase())) {
            const error = new ErrorHint(hintPair.re, "error");
            const hint = new ErrorHint(hintPair.hint, "hint");
            error.addChild(hint);
            this.data.push(error);

            if (!hintPair.hint.startsWith("No hints found for")) {
              meaningfulHintFound = true;
            }
          }
        }
      }

      if (!this.data.length) {
        this.data.push(
          new ErrorHint(`No hints found for ${errorMsg}`, "error")
        );
      }

      this._onDidChangeTreeData.fire();
      return meaningfulHintFound;
    } catch (error) {
      Logger.errorNotify(
        `Error processing hints file (line ${error.mark?.line}): ${error.message}`,
        error,
        "ErrorHintProvider searchError"
      );
      return false;
    }
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

  getTreeItem(element: ErrorHint): vscode.TreeItem {
    let treeItem = new vscode.TreeItem(element.label);

    if (element.type === "error") {
      if (element.label.startsWith("No hints found")) {
        treeItem.label = `⚠️ ${element.label}`;
      } else {
        treeItem.label = `🔍 ${element.label}`;
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded; // Ensure errors are expanded by default
      }
    } else if (element.type === "hint") {
      treeItem.label = `💡 ${element.label}`;
    }

    return treeItem;
  }

  getChildren(element?: ErrorHint): Thenable<ErrorHint[]> {
    if (element) {
      return Promise.resolve(element.children); // Return children if there's a parent element
    } else {
      return Promise.resolve(this.data);
    }
  }

  clearErrorHints() {
    this.data = [];
    this._onDidChangeTreeData.fire(); // Notify the view to refresh
  }
}

function getHintsYmlPath(espIdfPath: string): string {
  const separator = os.platform() === "win32" ? "\\" : "/";
  return `${espIdfPath}${separator}tools${separator}idf_py_actions${separator}hints.yml`;
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
      .filter((diagnostic) => 
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
        // Get hint for this error message
        const hint = this.hintProvider.getHintForError(diagnostic.message);
        
        if (hint) {
          // We found a hint, return it with markdown formatting
          return new vscode.Hover(
            new vscode.MarkdownString(`**ESP-IDF Hint**: ${hint}`)
          );
        } else {
          // No hint found, search for one
          this.hintProvider.searchError(diagnostic.message, vscode.workspace.workspaceFolders?.[0])
            .then(found => {
              // This will happen after the hover is displayed,
              // but at least it will update the hint panel for next time
              if (found) {
                vscode.commands.executeCommand("errorHints.focus");
              }
            });
          
          // Return basic info that a hint might be available in the panel
          return new vscode.Hover(
            new vscode.MarkdownString(`Checking for ESP-IDF hints for this error...`)
          );
        }
      }
    }

    // No matching diagnostics found at this position
    return null;
  }
}
