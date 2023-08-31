import * as os from 'os';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as idfConf from "../../idfConfiguration";
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
  public type: 'error' | 'hint';
  public children: ErrorHint[] = [];

  constructor(public label: string, type: 'error' | 'hint') {
      this.type = type;
  }

  addChild(child: ErrorHint) {
      this.children.push(child);
  }
}

export class ErrorHintProvider implements vscode.TreeDataProvider<ErrorHint> {
	constructor(private context: vscode.ExtensionContext) { }
	private _onDidChangeTreeData: vscode.EventEmitter<ErrorHint | undefined | null | void> = new vscode.EventEmitter<ErrorHint | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ErrorHint | undefined | null | void> = this._onDidChangeTreeData.event;

	private data: ErrorHint[] = [];

  searchError(errorMsg: string, workspace) {
    const espIdfPath = idfConf.readParameter("idf.espIdfPath", workspace) as string;
    const hintsPath = getHintsYmlPath(espIdfPath);
    const fileContents = fs.readFileSync(hintsPath, 'utf-8');
    const hintsData = yaml.load(fileContents);

    const reHintsPairArray: ReHintPair[] = this.loadHints(hintsData);

    this.data = [];
    for (const hintPair of reHintsPairArray) {
    const match = new RegExp(hintPair.re).exec(errorMsg);
    if (match) {
        let finalHint = hintPair.hint;

        if (hintPair.match_to_output && hintPair.hint.includes("{}")) {
            // Replace {} with the first capturing group from the regex match
            finalHint = hintPair.hint.replace("{}", match[0]);
        }

        const error = new ErrorHint(hintPair.re, 'error');
        const hint = new ErrorHint(finalHint, 'hint');
        error.addChild(hint); 
        this.data.push(error);
    }
}

    if (!this.data.length) {
      console.log('No hints found');
      this.data.push(new ErrorHint(`No hints found for ${errorMsg}`, 'error'));
    }

    this._onDidChangeTreeData.fire();
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

                reHintsPairArray.push(new ReHintPair(re, hint, entry.match_to_output));
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
      const result = entry.replace(/\{(\d+)\}/g, (_, idx) => vars[Number(idx)] || "");
      return result;
  }

  getTreeItem(element: ErrorHint): vscode.TreeItem {
    let treeItem = new vscode.TreeItem(element.label);

    if (element.type === 'error') {
        if (element.label.startsWith("No hints found")) {
          treeItem.label = `⚠️ ${element.label}`
        } else {
            treeItem.label = `🔍 ${element.label}`;
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded; // Ensure errors are expanded by default
        }
    } else if (element.type === 'hint') {
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
}

function getHintsYmlPath(espIdfPath: string): string {
  const separator = os.platform() === 'win32' ? '\\' : '/';
  return `${espIdfPath}${separator}tools${separator}idf_py_actions${separator}hints.yml`;
}