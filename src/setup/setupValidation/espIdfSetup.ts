/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 27th February 2023 3:00:15 pm
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

import { join } from "path";
import { IdfSetup } from "../../views/setup/types";
import { IdfToolsManager } from "../../idfToolsManager";
import { saveSettings } from "../setupInit";
import { pathExists } from "fs-extra";
import { Logger } from "../../logger/logger";
import { checkPyVenv } from "./pythonEnv";
import { ConfigurationTarget, StatusBarItem, Uri } from "vscode";
import { getPythonEnvPath } from "../../pythonManager";

export async function useIdfSetupSettings(
  setupConf: IdfSetup,
  saveScope: ConfigurationTarget,
  workspaceFolderUri: Uri,
  espIdfStatusBar: StatusBarItem
) {
  await saveSettings(
    setupConf.idfPath,
    setupConf.toolsPath,
    setupConf.gitPath,
    setupConf.sysPythonPath,
    saveScope,
    workspaceFolderUri,
    espIdfStatusBar,
    false
  );
}

export async function checkIdfSetup(
  setupConf: IdfSetup,
  logToChannel: boolean = true
) {
  try {
    if (!setupConf.idfPath) {
      return false;
    }
    const doesIdfPathExists = await pathExists(setupConf.idfPath);
    if (!doesIdfPathExists) {
      return false;
    }
    const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
      setupConf.idfPath
    );
    const exportedToolsPaths = await idfToolsManager.exportPathsInString(
      join(setupConf.toolsPath, "tools"),
      ["cmake", "ninja"]
    );
    const toolsInfo = await idfToolsManager.getRequiredToolsInfo(
      join(setupConf.toolsPath, "tools"),
      exportedToolsPaths,
      ["cmake", "ninja"],
      logToChannel
    );

    const failedToolsResult = toolsInfo.filter(
      (tInfo) =>
        !tInfo.doesToolExist && ["cmake", "ninja"].indexOf(tInfo.name) === -1
    );

    if (failedToolsResult.length) {
      return false;
    }
    let virtualEnvPython = "";
    if (setupConf.python) {
      virtualEnvPython = setupConf.python;
    } else {
      virtualEnvPython = await getPythonEnvPath(
        setupConf.idfPath,
        setupConf.toolsPath,
        setupConf.sysPythonPath
      );
    }

    const pyEnvReqs = await checkPyVenv(virtualEnvPython, setupConf.idfPath);
    return pyEnvReqs;
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : `Error checking Idf Setup ${setupConf.idfPath}`;
    Logger.error(msg, error, "espIdfSetup checkIdfSetup");
    return false;
  }
}
