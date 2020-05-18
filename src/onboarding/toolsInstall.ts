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

import * as path from "path";
import * as vscode from "vscode";
import { DownloadManager } from "../downloadManager";
import * as idfConf from "../idfConfiguration";
import { IdfToolsManager } from "../idfToolsManager";
import { InstallManager } from "../installManager";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { PackageProgress } from "../PackageProgress";
import { OnBoardingPanel } from "./OnboardingPanel";
import { installPythonRequirements } from "./pythonReqsManager";
import {
  sendChecksumResult,
  sendDownloadDetail,
  sendDownloadFailed,
  sendDownloadPercentage,
} from "./updateViewMethods";

export async function downloadToolsInIdfToolsPath(
  espIdfPath: string,
  idfToolsManager: IdfToolsManager,
  installDir: string,
  confTarget: vscode.ConfigurationTarget,
  selectedWorkspaceFolder: vscode.WorkspaceFolder,
  systemPythonPath: string
) {
  // In case IDF tools path is of the form path1:path2, tell the user for single path
  const manyPathsInIdfTools = installDir.split(path.delimiter);
  if (manyPathsInIdfTools.length > 1) {
    Logger.infoNotify("Please introduce a single path");
    return;
  }
  const downloadManager = new DownloadManager(installDir);
  const installManager = new InstallManager(installDir);
  return vscode.window.withProgress(
    {
      cancellable: false,
      location: vscode.ProgressLocation.Notification,
      title: "ESP-IDF Tools",
    },
    async (
      progress: vscode.Progress<{ message: string; increment?: number }>
    ) => {
      const packagesProgress = await idfToolsManager
        .getPackageList()
        .then((pkgs) => {
          return pkgs.map((pkg) => {
            return new PackageProgress(
              pkg.name,
              sendDownloadPercentage,
              sendChecksumResult,
              sendDownloadDetail,
              sendDownloadFailed
            );
          });
        });
      OutputChannel.appendLine("");
      Logger.info("");
      await downloadManager
        .downloadPackages(idfToolsManager, progress, packagesProgress)
        .catch((reason) => {
          OutputChannel.appendLine(reason);
          Logger.info(reason);
        });
      OutputChannel.appendLine("");
      Logger.info("");
      await installManager
        .installPackages(idfToolsManager, progress)
        .then(() => {
          OnBoardingPanel.postMessage({ command: "set_tools_setup_finish" });
        })
        .catch((reason) => {
          OutputChannel.appendLine(reason);
          Logger.info(reason);
        });
      progress.report({
        message: `Installing python virtualenv and ESP-IDF python requirements...`,
      });
      OutputChannel.appendLine(
        "Installing python virtualenv and ESP-IDF python requirements..."
      );
      Logger.info(
        "Installing python virtualenv and ESP-IDF python requirements..."
      );
      const pyEnvResult = await installPythonRequirements(
        espIdfPath,
        installDir,
        confTarget,
        selectedWorkspaceFolder,
        systemPythonPath
      ).catch((reason) => {
        OutputChannel.appendLine(reason);
        Logger.info(reason);
      });
      let exportPaths = await idfToolsManager.exportPaths(
        path.join(installDir, "tools")
      );
      const pythonBinPath =
        pyEnvResult ||
        (idfConf.readParameter(
          "idf.pythonBinPath",
          selectedWorkspaceFolder
        ) as string);
      // Append System Python and Virtual Env Python to PATH
      exportPaths =
        path.dirname(pythonBinPath) +
        path.delimiter +
        path.dirname(systemPythonPath) +
        path.delimiter +
        exportPaths;
      const exportVars = await idfToolsManager.exportVars(
        path.join(installDir, "tools")
      );
      OutputChannel.appendLine("");
      Logger.info("");
      OutputChannel.appendLine(
        "The following paths should be added to env PATH"
      );
      Logger.info("The following paths should be added to env PATH");
      OutputChannel.appendLine(exportPaths);
      Logger.info(exportPaths);
      OutputChannel.appendLine("");
      Logger.info("");
      await idfConf.writeParameter(
        "idf.customExtraPaths",
        exportPaths,
        confTarget,
        selectedWorkspaceFolder
      );
      await idfConf.writeParameter(
        "idf.customExtraVars",
        exportVars,
        confTarget,
        selectedWorkspaceFolder
      );
      OnBoardingPanel.postMessage({
        command: "load_custom_paths",
        custom_vars: JSON.parse(exportVars),
        custom_paths: exportPaths,
      });
    }
  );
}
