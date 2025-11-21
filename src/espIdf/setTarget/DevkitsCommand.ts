/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 8th January 2021 5:34:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import * as fs from "fs"
import { join } from "path";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { appendIdfAndToolsToPath, execChildProcess } from "../../utils";
import { OutputChannel } from "../../logger/outputChannel";
import { getOpenOcdScripts } from "../openOcd/boardConfiguration";

export class DevkitsCommand {
  private workspaceRoot: vscode.Uri;

  constructor(workspaceRoot: vscode.Uri) {
    this.workspaceRoot = workspaceRoot;
  }

  public async runDevkitsScript(openOCDVersion: string): Promise<string> {
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        this.workspaceRoot
      );
      if (!workspaceFolder) {
        throw new Error("No workspace folder found");
      }

      const toolsPath = idfConf.readParameter(
        "idf.toolsPath",
        this.workspaceRoot
      ) as string;

      if (!toolsPath || !openOCDVersion) {
        throw new Error("Could not get toolsPath or OpenOCD version");
      }

      const scriptPath = join(
        toolsPath,
        "tools",
        "openocd-esp32",
        openOCDVersion,
        "openocd-esp32",
        "share",
        "openocd",
        "espressif",
        "tools",
        "esp_detect_config.py"
      );

      const openOcdScriptsPath = await getOpenOcdScripts(this.workspaceRoot);
      if (!openOcdScriptsPath) {
        throw new Error("Could not get OpenOCD scripts path");
      }

      const espConfigPath = join(openOcdScriptsPath, "esp-config.json");

      const notificationMode = idfConf.readParameter(
        "idf.notificationMode",
        this.workspaceRoot
      ) as string;

      const ProgressLocation =
        notificationMode === idfConf.NotificationMode.All ||
        notificationMode === idfConf.NotificationMode.Notifications
          ? vscode.ProgressLocation.Notification
          : vscode.ProgressLocation.Window;

      const pythonBinPath = await getVirtualEnvPythonPath(this.workspaceRoot);
      const modifiedEnv = await appendIdfAndToolsToPath(this.workspaceRoot);

      // Remove OPENOCD_USB_ADAPTER_LOCATION from environment during device detection
      // to allow scanning all available devices, not just the one at the configured location
      delete modifiedEnv.OPENOCD_USB_ADAPTER_LOCATION;

      OutputChannel.init();
      OutputChannel.appendLine(
        "Running ESP Detect Config...",
        "ESP Detect Config"
      );
      OutputChannel.show();

      return await vscode.window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation,
          title: "ESP-IDF: Running ESP Detect Config",
        },
        async (
          progress: vscode.Progress<{ message: string; increment: number }>,
          cancelToken: vscode.CancellationToken
        ) => {
          try {
            const result = await execChildProcess(
              pythonBinPath,
              [scriptPath, "--esp-config", espConfigPath],
              this.workspaceRoot.fsPath,
              OutputChannel.init(),
              { env: modifiedEnv },
              cancelToken
            );

            OutputChannel.appendLine(result, "ESP Detect Config");
            OutputChannel.show();
            vscode.window.showInformationMessage("ESP Detect Config completed");
            return result;
          } catch (error) {
            const msg = error.message
              ? error.message
              : "Error running ESP Detect Config";
            Logger.errorNotify(msg, error, "DevkitsCommand");
            OutputChannel.appendLine(msg, "ESP Detect Config");
            OutputChannel.show();
            throw error;
          }
        }
      );
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Error running ESP Detect Config";
      Logger.errorNotify(msg, error, "DevkitsCommand");
      OutputChannel.appendLine(msg, "ESP Detect Config");
      OutputChannel.show();
    }
  }

  public async getScriptPath(openOCDVersion: string): Promise<string | null> {
    try {
      const toolsPath = idfConf.readParameter(
        "idf.toolsPath",
        this.workspaceRoot
      ) as string;

      if (!toolsPath || !openOCDVersion) {
        return null;
      }

      const scriptPath = join(
        toolsPath,
        "tools",
        "openocd-esp32",
        openOCDVersion,
        "openocd-esp32",
        "share",
        "openocd",
        "espressif",
        "tools",
        "esp_detect_config.py"
      );

      return fs.existsSync(scriptPath) ? scriptPath : null;
    } catch (error) {
      return null;
    }
  }
}
