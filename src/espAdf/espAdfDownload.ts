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
import { join } from "path";
import * as vscode from "vscode";
import * as idfConf from "../idfConfiguration";
import { checkGitExists, dirExistPromise } from "../utils";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";

import { EspAdfCloning } from "./espAdfCloning";
import { ensureDir } from "fs-extra";

export async function getEspAdf() {
  const toolsDir = await idfConf.readParameter("idf.toolsPath");
  const installDir = await vscode.window.showQuickPick(
    [
      {
        label: `Use current ESP-IDF Tools directory (${toolsDir})`,
        target: "current",
      },
      { label: "Choose a container directory...", target: "another" },
    ],
    { placeHolder: "Select a directory to save ESP-ADF" }
  );
  if (!installDir) {
    return;
  }
  let installDirPath: string;
  if (installDir.target === "another") {
    const chosenFolder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (!chosenFolder || chosenFolder.length < 1) {
      return;
    }
    installDirPath = chosenFolder[0].fsPath;
  } else {
    const doesToolsDirExists = await dirExistPromise(toolsDir);
    if (!doesToolsDirExists) {
      Logger.infoNotify(`${toolsDir} doesn't exist.`);
      return;
    }
    installDirPath = toolsDir;
  }
  await vscode.window.withProgress(
    {
      cancellable: true,
      location: vscode.ProgressLocation.Notification,
      title: "ESP-ADF",
    },
    async (
      progress: vscode.Progress<{ message: string; increment: number }>,
      cancelToken: vscode.CancellationToken
    ) => {
      try {
        const gitVersion = await checkGitExists(this.projectDir);
        if (!gitVersion || gitVersion === "Not found") {
          throw new Error("Git is not found in PATH");
        }
        const adfInstaller = new EspAdfCloning(installDirPath);
        cancelToken.onCancellationRequested((e) => {
          adfInstaller.cancel();
        });
        await adfInstaller.downloadEspAdfByClone(progress);
        const target = idfConf.readParameter("idf.saveScope");
        await idfConf.writeParameter(
          "idf.espAdfPath",
          join(installDirPath, "esp-adf"),
          target
        );
        Logger.infoNotify("ESP-ADF has been installed");
      } catch (error) {
        OutputChannel.appendLine(error.message);
        Logger.errorNotify(error.message, error);
      }
    }
  );
}
