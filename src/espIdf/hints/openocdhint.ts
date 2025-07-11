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

import * as vscode from "vscode";
import * as yaml from "js-yaml";
import { readFile, pathExists } from "fs-extra";
import * as path from "path";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { PreCheck } from "../../utils";
import { getOpenOcdHintsYmlPath } from "./utils";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { ErrorHintProvider } from "./index";

interface OpenOCDHint {
  source?: string;
  re: string;
  hint: string;
  ref?: string;
  match_to_output?: boolean;
  variables?: Array<{
    re_variables: string[];
    hint_variables: string[];
  }>;
}

export class OpenOCDErrorMonitor {
  private static instance: OpenOCDErrorMonitor;
  private errorHintProvider: ErrorHintProvider;
  private hintsData: OpenOCDHint[] = [];
  private errorBuffer: string[] = [];
  private workspaceRoot: vscode.Uri;
  private debounceTimer: NodeJS.Timeout | null = null;
  private openOCDLogWatcher: vscode.Disposable | null = null;
  private readonly DEBOUNCE_TIME = 300; // ms

  private constructor(
    errorHintProvider: ErrorHintProvider,
    workspaceRoot: vscode.Uri
  ) {
    this.errorHintProvider = errorHintProvider;
    this.workspaceRoot = workspaceRoot;
  }

  public static init(
    errorHintProvider: ErrorHintProvider,
    workspaceRoot: vscode.Uri
  ): OpenOCDErrorMonitor {
    if (!OpenOCDErrorMonitor.instance) {
      OpenOCDErrorMonitor.instance = new OpenOCDErrorMonitor(
        errorHintProvider,
        workspaceRoot
      );
    }
    return OpenOCDErrorMonitor.instance;
  }

  public async initialize(): Promise<void> {
    try {
        // Check OpenOCD version first
        const openOCDManager = OpenOCDManager.init();
        const version = await openOCDManager.version();

        if (!version) {
            Logger.info(
              "Could not determine OpenOCD version. Hints file won't be loaded."
            );
            return null;
        }

        // Skip initialization if openOCD version is not supporting hints
        const minRequiredVersion = "v0.12.0-esp32-20250226";
        if (!version || !PreCheck.openOCDVersionValidator(minRequiredVersion, version)) {
            Logger.info(`OpenOCD version ${version} doesn't support hints. Minimum required: ${minRequiredVersion}`);
            return;
        }

      // Load OpenOCD hints data
      const toolsPath = idfConf.readParameter(
        "idf.toolsPath",
        this.workspaceRoot
      ) as string;
      
      const openOcdHintsPath = await getOpenOcdHintsYmlPath(toolsPath, version);
      
      if (openOcdHintsPath) {
        try {
          const fileContents = await readFile(openOcdHintsPath, "utf-8");
          this.hintsData = yaml.load(fileContents) as OpenOCDHint[];
          Logger.info(`Loaded OpenOCD hints from ${openOcdHintsPath}`);
        } catch (error) {
          Logger.errorNotify(
            `Error processing OpenOCD hints file: ${error.message}`,
            error,
            "OpenOCDErrorMonitor initialize"
          );
          this.hintsData = [];
        }
      } else {
        Logger.info(`OpenOCD hints file not found at ${openOcdHintsPath}`);
        this.hintsData = [];
      }

      // Start monitoring OpenOCD output
      this.watchOpenOCDStatus();
    } catch (error) {
      Logger.errorNotify(
        `Error initializing OpenOCD error monitor: ${error.message}`,
        error,
        "OpenOCDErrorMonitor initialize"
      );
    }
  }

  public dispose(): void {
    if (this.openOCDLogWatcher) {
      this.openOCDLogWatcher.dispose();
      this.openOCDLogWatcher = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private watchOpenOCDStatus(): void {
    // Set up watcher for OpenOCD output
    if (this.openOCDLogWatcher) {
      this.openOCDLogWatcher.dispose();
    }
    
    const openOCDManager = OpenOCDManager.init();
    
    // Add event listener to OpenOCDManager to detect when there's new output
    openOCDManager.on("data", (data) => {
      const content = data.toString();
      this.processOutput(content);
    });
    
    openOCDManager.on("error", (error, data) => {
      const content = data ? data.toString() : error.message;
      this.processOutput(content);
    });
    
    this.openOCDLogWatcher = {
      dispose: () => {
        openOCDManager.removeAllListeners("data");
        openOCDManager.removeAllListeners("error");
      }
    };
  }

  private processOutput(content: string): void {
    if (!content) return;
    
    // Split into lines and process each line
    const lines = content.split('\n');
    
    for (const line of lines) {
      this.processOutputLine(line.trim());
    }
  }

  public processOutputLine(line: string): void {
    // Skip empty lines
    if (!line) return;
    
    // Add line to buffer
    this.errorBuffer.push(line);
    
    // Keep the buffer at a reasonable size (last 100 lines)
    if (this.errorBuffer.length > 100) {
      this.errorBuffer.shift();
    }
    
    // Check for OpenOCD error patterns in the recent output
    if (line.includes("Error:") || line.includes("Warn:")) {
      this.debouncedAnalyzeErrors();
    }
  }

  private debouncedAnalyzeErrors(): void {
    // Debounce to avoid excessive processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.analyzeErrors();
    }, this.DEBOUNCE_TIME);
  }

  private async analyzeErrors(): Promise<void> {
    try {
      // Get the last few lines of context that might contain errors
      const context = this.errorBuffer.join("\n");
      
      // Look for error patterns
      for (const hint of this.hintsData) {
        // Skip if the hint is for a specific source that doesn't match
        if (hint.source && hint.source !== 'ocd') {
          continue;
        }
        
        // Process variables if they exist
        if (hint.variables && hint.variables.length > 0) {
          let foundMatch = false;
          
          for (const variableSet of hint.variables) {
            const reVariables = variableSet.re_variables;
            const hintVariables = variableSet.hint_variables;
            
            let re = this.formatEntry(reVariables, hint.re);
            let hintMsg = this.formatEntry(hintVariables, hint.hint);
            
            const regex = new RegExp(re, 'i');
            const match = regex.exec(context);
            
            if (match) {
              // Format the hint message if match_to_output is true
              if (hint.match_to_output && match.length > 0 && hintMsg.includes("{}")) {
                hintMsg = hintMsg.replace("{}", match[0]);
              }
              
              // Show the error hint
              await this.showErrorHint(match[0], hintMsg, hint.ref);
              foundMatch = true;
              break;
            }
          }
          
          if (foundMatch) break;
        } else {
          // No variables, just check the regex directly
          const regex = new RegExp(hint.re, 'i');
          const match = regex.exec(context);
          
          if (match) {
            // Format the hint message
            let hintMessage = hint.hint;
            
            if (hint.match_to_output && match.length > 0 && hintMessage.includes("{}")) {
              hintMessage = hintMessage.replace("{}", match[0]);
            }
            
            // Trigger the error hint display
            await this.showErrorHint(match[0], hintMessage, hint.ref);
            
            // Only show one hint at a time to avoid overwhelming the user
            break;
          }
        }
      }
    } catch (error) {
      Logger.errorNotify(
        `Error analyzing OpenOCD output: ${error.message}`,
        error,
        "analyzeErrors"
      );
    }
  }

  private formatEntry(vars: string[], entry: string): string {
    let formattedEntry = entry;
    
    // Replace numbered placeholders with variables
    let i = 0;
    while (formattedEntry.includes("{}")) {
      formattedEntry = formattedEntry.replace("{}", `{${i++}}`);
    }
    
    // Replace {n} with corresponding variable from vars array
    formattedEntry = formattedEntry.replace(/\{(\d+)\}/g, (match, idx) => {
      const index = parseInt(idx, 10);
      return index < vars.length ? vars[index] : "";
    });
    
    return formattedEntry;
  }

  private async showErrorHint(errorMessage: string, hintMessage: string, reference?: string): Promise<void> {
    try {
      // Use the existing error hint provider to display the hint
      await this.errorHintProvider.showOpenOCDErrorHint(errorMessage, hintMessage, reference);
      
      // Focus the error hints view
      await vscode.commands.executeCommand("idfErrorHints.focus");
    } catch (error) {
      Logger.errorNotify(
        `Error showing OpenOCD error hint: ${error.message}`,
        error,
        "showErrorHint"
      );
    }
  }
}