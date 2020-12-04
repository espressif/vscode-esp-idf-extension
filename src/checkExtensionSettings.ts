/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Sunday, 10th May 2020 11:33:22 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as vscode from "vscode";
import {
  getSetupInitialValues,
  isCurrentInstallValid,
  saveSettings,
} from "./setup/setupInit";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";
import { installExtensionPyReqs } from "./pythonManager";

export async function checkExtensionSettings(extensionPath: string) {
  const isExtensionConfigured = await isCurrentInstallValid();
  if (isExtensionConfigured) {
    return;
  }
  await vscode.window.withProgress(
    {
      cancellable: false,
      location: vscode.ProgressLocation.Notification,
      title: "ESP-IDF: Loading initial configuration...",
    },
    async (
      progress: vscode.Progress<{ message: string; increment: number }>,
      cancelToken: vscode.CancellationToken
    ) => {
      try {
        const setupArgs = await getSetupInitialValues(extensionPath, progress);
        if (
          setupArgs.espIdfPath &&
          setupArgs.espToolsPath &&
          setupArgs.pyBinPath &&
          setupArgs.exportedPaths &&
          setupArgs.exportedVars
        ) {
          if (!setupArgs.hasPrerequisites) {
            vscode.commands.executeCommand("espIdf.setup.start", setupArgs);
          }
          await installExtensionPyReqs(
            setupArgs.pyBinPath,
            setupArgs.espToolsPath,
            undefined,
            OutputChannel.init(),
            cancelToken
          );
          await saveSettings(
            setupArgs.espIdfPath,
            setupArgs.pyBinPath,
            setupArgs.exportedPaths,
            setupArgs.exportedVars
          );
        } else if (typeof process.env.WEB_IDE === "undefined") {
          vscode.commands.executeCommand("espIdf.setup.start", setupArgs);
        }
      } catch (error) {
        Logger.errorNotify(error.message, error);
        vscode.commands.executeCommand("espIdf.setup.start");
      }
    }
  );
}
