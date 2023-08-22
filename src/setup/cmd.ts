/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 21st August 2023 3:30:23 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import {
  CancellationToken,
  ConfigurationTarget,
  Progress,
  ProgressLocation,
  Uri,
  window,
} from "vscode";
import { getEspIdfVersions } from "./espIdfVersionList";
import { Logger } from "../logger/logger";
import { ESP } from "../config";
import { downloadInstallIdfVersion } from "./espIdfDownload";
import { IdfToolsManager } from "../idfToolsManager";
import { join } from "path";
import { saveSettings } from "./setupInit";
import {
  getUnixPythonList,
  installExtensionPyReqs,
  installPythonEnvFromIdfTools,
} from "../pythonManager";
import { loadIdfSetupsFromEspIdfJson } from "./existingIdfSetups";
import { OutputChannel } from "../logger/outputChannel";
import { downloadEspIdfTools } from "./toolInstall";
import { isBinInPath } from "../utils";
import { pathExists } from "fs-extra";

export async function useExistingEspIdfJsonSetup() {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;
  let toolsPath = join(containerPath, ".espressif");
  const actualToolsPath = await openFolder(
    "Choose ESP-IDF Tools (.espressif directory)"
  );
  if (actualToolsPath) {
    toolsPath = actualToolsPath;
  }
  const espIdfJsonPath = join(toolsPath, "esp_idf.json");
  const espIdfJsonExists = await pathExists(espIdfJsonPath);
  if (!espIdfJsonExists) {
    Logger.infoNotify(`${espIdfJsonPath} doesn't exists.`);
    OutputChannel.appendLineAndShow(`${espIdfJsonPath} doesn't exists.`);
    return;
  }
  const idfSetups = await loadIdfSetupsFromEspIdfJson(toolsPath);
  if (!idfSetups) {
    OutputChannel.appendLineAndShow("No IDF Setups found");
    return;
  }
  let quickPickItems = idfSetups.map((idfSetup) => {
    return {
      description: idfSetup.idfPath,
      label: idfSetup.version,
      target: idfSetup.id,
      ...idfSetup,
    };
  });
  const espIdfVersion = await window.showQuickPick(quickPickItems, {
    placeHolder: "Select ESP-IDF version",
  });
  if (!espIdfVersion) {
    Logger.infoNotify("No ESP-IDF version selected.");
    OutputChannel.appendLineAndShow("No ESP-IDF version selected.");
    return;
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfVersion.idfPath
  );
  const exportedToolsPaths = await idfToolsManager.exportPathsInString(
    join(toolsPath, "tools"),
    ["cmake", "ninja"]
  );
  const exportedVars = await idfToolsManager.exportVars(
    join(toolsPath, "tools")
  );
  await saveSettings(
    espIdfVersion.idfPath,
    espIdfVersion.python,
    exportedToolsPaths,
    exportedVars,
    toolsPath,
    espIdfVersion.gitPath,
    ConfigurationTarget.Global
  );
}

export async function openFolder(openLabel: string) {
  const selectedFolder = await window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel,
  });
  if (selectedFolder && selectedFolder.length > 0) {
    return selectedFolder[0].fsPath;
  } else {
    window.showInformationMessage("No folder selected");
  }
}

export async function downloadEspIdf(extensionPath: Uri) {
  const espIdfVersions = await getEspIdfVersions(extensionPath.fsPath);

  let quickPickItems = espIdfVersions.map((k) => {
    return {
      description: k.filename,
      label: k.name,
      target: k.filename,
      ...k,
    };
  });
  const espIdfVersion = await window.showQuickPick(quickPickItems, {
    placeHolder: "Select ESP-IDF version",
  });
  if (!espIdfVersion) {
    window.showInformationMessage("No ESP-IDF version selected.");
    return;
  }
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

  let destPath = join(containerPath, "esp");
  let toolsPath = join(containerPath, ".espressif");
  let espIdfPath = "";

  if (espIdfVersion.filename === "manual") {
    espIdfPath = await openFolder("Select ESP-IDF (IDF_PATH)");
  } else {
    const actualDestPath = await openFolder("Where to save ESP-IDF?");
    if (actualDestPath) {
      destPath = actualDestPath;
    }
  }

  const actualToolsPath = await openFolder(
    "Choose ESP-IDF Tools (IDF_TOOLS_PATH)"
  );
  if (actualToolsPath) {
    toolsPath = actualToolsPath;
  }

  const mirror = await window.showQuickPick(
    [
      {
        description: "Mirror",
        label: "Espressif",
        target: ESP.IdfMirror.Espressif,
      },
      {
        description: "Mirror",
        label: "Github",
        target: ESP.IdfMirror.Github,
      },
    ],
    { placeHolder: "Select download mirror" }
  );

  if (!mirror) {
    window.showInformationMessage("No mirror selected.");
    return;
  }

  let idfGitPath = "git";
  let idfPythonPath = "";

  window.withProgress(
    {
      cancellable: true,
      location: ProgressLocation.Notification,
      title: "Installing ESP-IDF",
    },
    async (
      progress: Progress<{
        message: string;
        increment: number;
      }>,
      cancelToken: CancellationToken
    ) => {
      let onReqPkgs = [];
      if (process.platform === "win32") {
        const embedPaths = await this.installEmbedPyGit(
          toolsPath,
          progress,
          cancelToken
        );
        idfGitPath = embedPaths.idfGitPath;
        idfPythonPath = embedPaths.idfPythonPath;
        const canAccessCMake = await isBinInPath(
          "cmake",
          extensionPath.fsPath,
          process.env
        );

        if (canAccessCMake === "") {
          onReqPkgs = onReqPkgs ? [...onReqPkgs, "cmake"] : ["cmake"];
        }

        const canAccessNinja = await isBinInPath(
          "ninja",
          extensionPath.fsPath,
          process.env
        );

        if (canAccessNinja === "") {
          onReqPkgs = onReqPkgs ? [...onReqPkgs, "ninja"] : ["ninja"];
        }
      } else {
        const pythonList = await getUnixPythonList(extensionPath.fsPath);
        let pythonItems = pythonList.map((pyVer) => {
          return {
            description: "",
            label: pyVer,
            target: pyVer,
          };
        });
        const selectPyVersion = await window.showQuickPick(pythonItems, {
          placeHolder: "Select ESP-IDF version",
        });

        if (!selectPyVersion) {
          window.showInformationMessage("No python selected");
          return;
        }
        idfPythonPath = selectPyVersion.target;
      }

      if (espIdfVersion.filename !== "manual") {
        espIdfPath = await downloadInstallIdfVersion(
          espIdfVersion,
          destPath,
          mirror.target,
          idfGitPath,
          progress,
          cancelToken
        );
      }
      const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
        espIdfPath
      );

      await downloadEspIdfTools(
        toolsPath,
        idfToolsManager,
        mirror.target,
        progress,
        idfPythonPath,
        cancelToken,
        onReqPkgs
      );

      const virtualEnvPath = await installPythonEnvFromIdfTools(
        espIdfPath,
        toolsPath,
        undefined,
        idfPythonPath,
        idfGitPath,
        OutputChannel.init(),
        cancelToken
      );

      await installExtensionPyReqs(
        virtualEnvPath,
        espIdfPath,
        toolsPath,
        undefined,
        OutputChannel.init()
      );

      const exportedToolsPaths = await idfToolsManager.exportPathsInString(
        join(toolsPath, "tools"),
        onReqPkgs
      );
      const exportedVars = await idfToolsManager.exportVars(
        join(toolsPath, "tools"),
        onReqPkgs
      );

      await saveSettings(
        espIdfPath,
        virtualEnvPath,
        exportedToolsPaths,
        exportedVars,
        toolsPath,
        idfGitPath,
        ConfigurationTarget.Global
      );
    }
  );
}
