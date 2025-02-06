/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 6th February 2025 5:36:20 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { Uri } from "vscode";
import { readParameter } from "../idfConfiguration";
import { getEspIdfFromCMake, isBinInPath } from "../utils";
import { join } from "path";
import { IdfToolsManager, IEspIdfTool } from "../idfToolsManager";
import { getVirtualEnvPythonPath } from "../pythonManager";
import { checkPyVenv } from "./verifySetup";
import { createHash } from "crypto";

export function getIdfMd5sum(idfPath: string) {
  const md5Value = createHash("md5")
    .update(idfPath.replace(/\\/g, "/"))
    .digest("hex");
  return `esp-idf-${md5Value}`;
}

export async function isCurrentInstallValid(workspaceFolder: Uri) {
  const containerPath =
    process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME;

  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  let espIdfPath = customExtraVars["IDF_PATH"];
  const confToolsPath = customExtraVars["IDF_TOOLS_PATH"];
  const toolsPath =
    confToolsPath ||
    process.env.IDF_TOOLS_PATH ||
    join(containerPath, ".espressif");
  let idfPathVersion = await getEspIdfFromCMake(espIdfPath);
  if (idfPathVersion === "x.x" && process.platform === "win32") {
    espIdfPath = join(process.env.USERPROFILE, "Desktop", "esp-idf");
    idfPathVersion = await getEspIdfFromCMake(espIdfPath);
  }
  if (idfPathVersion === "x.x") {
    return false;
  }
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath
  );
  let extraReqPaths = [];
  if (process.platform !== "win32") {
    const canAccessCMake = await isBinInPath(
      "cmake",
      containerPath,
      process.env
    );
    if (!canAccessCMake) {
      extraReqPaths.push("cmake");
    }
    const canAccessNinja = await isBinInPath(
      "ninja",
      containerPath,
      process.env
    );
    if (!canAccessNinja) {
      extraReqPaths.push("ninja");
    }
  }
  const pathNameInEnv: string = Object.keys(customExtraVars).find(
    (k) => k.toUpperCase() == "PATH"
  );
  let toolsInfo: IEspIdfTool[] = [];
  if (customExtraVars[pathNameInEnv]) {
    toolsInfo = await idfToolsManager.getEIMToolsInfo(
      customExtraVars[pathNameInEnv],
      extraReqPaths,
      false
    );
  } else {
    const extraPaths = await idfToolsManager.exportPathsInString(
      join(toolsPath, "tools"),
      extraReqPaths
    );
    toolsInfo = await idfToolsManager.getRequiredToolsInfo(
      join(toolsPath, "tools"),
      extraPaths,
      extraReqPaths,
      false
    );
  }
  
  const failedToolsResult = toolsInfo.filter(
    (tInfo) =>
      tInfo.actual.indexOf("No match") !== -1 &&
      tInfo.actual.indexOf("Error") !== -1
  );

  if (failedToolsResult.length !== 0) {
    return false;
  }
  const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  const isPyEnvValid = await checkPyVenv(pythonBinPath, espIdfPath);
  return isPyEnvValid;
}