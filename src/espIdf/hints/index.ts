/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 18th June 2026 3:24:03 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { commands, Diagnostic, DiagnosticSeverity, ExtensionContext, languages, Uri, window } from "vscode";
import { ErrorHintProvider, HintHoverProvider } from "./provider";
import { registerIDFCommand } from "../../common/registerCommand";
import { updateHintsStatusBarItem } from "../../statusBar";
import { OpenOCDErrorMonitor } from "./openocdhint";
import { ESP } from "../../config";

export async function registerHintsCommands(context: ExtensionContext) {
  const treeDataProvider = new ErrorHintProvider(context);

  const treeView = window.createTreeView("espIdf.errorHints", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });

  treeView.title = "Error Hints";

  // Add the tree view to disposables
  context.subscriptions.push(treeView);

  // Register commands for clearing error hints
  registerIDFCommand(context, "espIdf.errorHints.clearAll", () => {
    treeDataProvider.clearErrorHints(true); // Clear both build and OpenOCD errors
    updateHintsStatusBarItem(false);
  });

  registerIDFCommand(context, "espIdf.errorHints.clearBuildErrors", () => {
    treeDataProvider.clearErrorHints(false); // Clear only build errors
    updateHintsStatusBarItem(false);
  });

  registerIDFCommand(context,"espIdf.errorHints.clearOpenOCDErrors", () => {
    treeDataProvider.clearOpenOCDErrorsOnly(); // Clear only OpenOCD errors
    updateHintsStatusBarItem(false);
  });
  const openOCDErrorMonitor = OpenOCDErrorMonitor.init(
    treeDataProvider
  );
  await openOCDErrorMonitor.initialize();

  // Register disposal of the monitor
  context.subscriptions.push(openOCDErrorMonitor);

  // Register command to manually search for errors
  registerIDFCommand(context,"espIdf.searchError", async () => {
    const errorMsg = await window.showInputBox({
      placeHolder: "Enter the error message",
    });
    if (errorMsg) {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      treeDataProvider.searchError(errorMsg, wsFolder.uri);
      await commands.executeCommand("espIdf.errorHints.focus");
    }
  });

  // Function to process all ESP-IDF diagnostics from the problems panel
  const processEspIdfDiagnostics = async () => {
    // Get all diagnostics from all files that have source "esp-idf"
    const espIdfDiagnostics: Array<{
      uri: Uri;
      diagnostic: Diagnostic;
    }> = [];

    // Collect all diagnostics from all files that have source "esp-idf"
    languages.getDiagnostics().forEach(([uri, diagnostics]) => {
      diagnostics
        .filter(
          (d) =>
            d.source === "esp-idf" &&
            d.severity === DiagnosticSeverity.Error
        )
        .forEach((diagnostic) => {
          espIdfDiagnostics.push({ uri, diagnostic });
        });
    });

    // Only clear build errors if no ESP-IDF diagnostics
    if (espIdfDiagnostics.length === 0) {
      treeDataProvider.clearErrorHints(false); // Don't clear OpenOCD errors
      return;
    }

    // Process all errors and collect hints
    const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    for (const { diagnostic } of espIdfDiagnostics) {
      await treeDataProvider.searchError(diagnostic.message, wsFolder.uri);
    }
  };

  // Attach a listener to the diagnostics collection
  context.subscriptions.push(
    languages.onDidChangeDiagnostics((_event) => {
      processEspIdfDiagnostics();
    })
  );

  // Register the HintHoverProvider
  context.subscriptions.push(
    languages.registerHoverProvider(
      { pattern: "**" },
      new HintHoverProvider(treeDataProvider)
    )
  );

  // Subscribe to changes in the hints tree and update the status bar item
  context.subscriptions.push(
    treeDataProvider.onDidChangeTreeData(() => {
      updateHintsStatusBarItem(treeDataProvider.hasHints());
    })
  );
}
