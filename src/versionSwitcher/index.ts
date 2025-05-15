/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th March 2024 7:18:49 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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

import { ConfigurationTarget, StatusBarItem, Uri, window } from "vscode";
import {
  getPreviousIdfSetups,
  loadIdfSetupsFromEspIdfJson,
} from "../setup/existingIdfSetups";
import {
  checkIdfSetup,
  useIdfSetupSettings,
} from "../setup/setupValidation/espIdfSetup";
import { readParameter } from "../idfConfiguration";
import { getIdfMd5sum } from "../setup/espIdfJson";
import { getEspIdfFromCMake } from "../utils";
import { IdfSetup } from "../views/setup/types";
import { getPythonPath, getVirtualEnvPythonPath } from "../pythonManager";

export async function selectIdfSetup(
  workspaceFolder: Uri,
  espIdfStatusBar: StatusBarItem
) {
  const globalStateSetups = await getPreviousIdfSetups(true);
  const toolsPath = readParameter("idf.toolsPath", workspaceFolder) as string;
  let existingIdfSetups = await loadIdfSetupsFromEspIdfJson(toolsPath);
  if (process.env.IDF_TOOLS_PATH && toolsPath !== process.env.IDF_TOOLS_PATH) {
    const systemIdfSetups = await loadIdfSetupsFromEspIdfJson(
      process.env.IDF_TOOLS_PATH
    );
    existingIdfSetups = [...existingIdfSetups, ...systemIdfSetups];
  }
  const currentIdfSetup = await getCurrentIdfSetup(workspaceFolder);
  let idfSetups = [...globalStateSetups, ...existingIdfSetups, currentIdfSetup];
  idfSetups = idfSetups.filter(
    (setup, index, self) =>
      index ===
      self.findIndex(
        (s) => s.idfPath === setup.idfPath && s.toolsPath === setup.toolsPath
      )
  );
  if (idfSetups.length === 0) {
    await window.showInformationMessage("No ESP-IDF Setups found");
    return;
  }
  const onlyValidIdfSetups = [
    ...new Map(
      idfSetups.filter((i) => i.isValid).map((item) => [item.idfPath, item])
    ).values(),
  ];
  const idfSetupOptions = onlyValidIdfSetups.map((idfSetup) => {
    return {
      label: `Version: v${idfSetup.version}`,
      description: `IDF_PATH: ${idfSetup.idfPath}`,
      detail: `IDF_TOOLS_PATH: ${idfSetup.toolsPath}`,
      target: idfSetup,
    };
  });
  const selectedIdfSetupOption = await window.showQuickPick(idfSetupOptions, {
    placeHolder: "Select a ESP-IDF version to use",
  });
  if (!selectedIdfSetupOption) {
    return;
  }
  await useIdfSetupSettings(
    selectedIdfSetupOption.target,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder,
    espIdfStatusBar
  );
  return selectedIdfSetupOption.target;
}

export async function getCurrentIdfSetup(
  workspaceFolder: Uri,
  logToChannel: boolean = true
) {
  const idfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const toolsPath = readParameter("idf.toolsPath", workspaceFolder) as string;
  const gitPath = readParameter("idf.gitPath", workspaceFolder);

  // FIX use system Python path as setting instead venv
  // REMOVE this line after neext release
  const sysPythonBinPath = await getPythonPath(workspaceFolder);
  let pythonBinPath = "";
  if (sysPythonBinPath) {
    pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  }
  if (!pythonBinPath) {
    pythonBinPath = readParameter(
      "idf.pythonBinPath",
      workspaceFolder
    ) as string;
  }

  const idfSetupId = getIdfMd5sum(idfPath);
  const idfVersion = await getEspIdfFromCMake(idfPath);
  const currentIdfSetup: IdfSetup = {
    id: idfSetupId,
    idfPath,
    gitPath,
    toolsPath,
    sysPythonPath: sysPythonBinPath,
    python: pythonBinPath,
    version: idfVersion,
    isValid: false,
  };
  currentIdfSetup.isValid = await checkIdfSetup(currentIdfSetup, logToChannel);
  return currentIdfSetup;
}
