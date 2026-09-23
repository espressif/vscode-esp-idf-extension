/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 29th November 2024 3:28:00 pm
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

import { pathExists, readJson } from "fs-extra";
import { join, resolve } from "path";
import { createHash } from "crypto";
import { EspIdfJson, IdfSetup, InstallationStatus } from "./types";
import { readParameter } from "../configuration/idf";
import { Logger } from "../common/logger";
import { compareVersion, getEspIdfFromCMake } from "../utils";
import { loadIdfSetupsFromEspIdfJson } from "./migrationTool";
import { WorkspaceFolder } from "vscode";

function defaultIdfToolsPath() {
  const containerPath =
    (process.platform === "win32"
      ? process.env.USERPROFILE
      : process.env.HOME) || "";
  return join(containerPath, ".espressif");
}

function uniqueToolsPaths(paths: (string | undefined)[]) {
  const unique = new Set<string>();
  for (const toolsPath of paths) {
    if (!toolsPath) {
      continue;
    }
    unique.add(resolve(toolsPath));
  }
  return [...unique];
}

function customExtraVarsMap(workspaceFolder?: WorkspaceFolder) {
  const customVarsSetting = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  if (
    customVarsSetting !== null &&
    typeof customVarsSetting === "object" &&
    !Array.isArray(customVarsSetting)
  ) {
    return customVarsSetting;
  }
  return {} as { [key: string]: string };
}

function idfSetupIdFromPath(idfPath: string) {
  const md5Value = createHash("md5")
    .update(idfPath.replace(/\\/g, "/"))
    .digest("hex");
  return `esp-idf-${md5Value}`;
}

async function loadIdfSetupFromEnvVars(customVars: {
  [key: string]: string;
}): Promise<IdfSetup | undefined> {
  const idfPath = customVars["IDF_PATH"] || process.env.IDF_PATH || "";
  const idfToolsPath =
    customVars["IDF_TOOLS_PATH"] ||
    process.env.IDF_TOOLS_PATH ||
    defaultIdfToolsPath();
  const [idfPathExists, idfToolsPathExists] = await Promise.all([
    pathExists(idfPath),
    pathExists(idfToolsPath),
  ]);
  const isValid = idfPathExists && idfToolsPathExists;
  if (!isValid) {
    return;
  }

  const pythonEnvPath =
    customVars["IDF_PYTHON_ENV_PATH"] || process.env.IDF_PYTHON_ENV_PATH || "";
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python3"];

  return {
    id: idfSetupIdFromPath(idfPath),
    activationScript: "",
    idfPath,
    gitPath: "",
    isValid,
    version: await getEspIdfFromCMake(idfPath),
    toolsPath: idfToolsPath,
    python: pythonEnvPath ? join(pythonEnvPath, ...pyDir) : "",
    sysPythonPath: "",
  };
}

export async function getIdfSetups(workspaceFolder?: WorkspaceFolder) {
  const customVars = customExtraVarsMap(workspaceFolder);
  const toolsPaths = uniqueToolsPaths([
    customVars["IDF_TOOLS_PATH"],
    process.env.IDF_TOOLS_PATH,
    defaultIdfToolsPath(),
  ]);

  const [eimIDFSetups, envIdfSetup, ...espIdfJsonSetups] = await Promise.all([
    loadIdfSetupsFromEimIdfJson(),
    loadIdfSetupFromEnvVars(customVars),
    ...toolsPaths.map((toolsPath) => loadIdfSetupsFromEspIdfJson(toolsPath)),
  ]);

  let resultingIdfSetups = eimIDFSetups.concat(...espIdfJsonSetups);
  if (envIdfSetup) {
    resultingIdfSetups.push(envIdfSetup);
  }

  resultingIdfSetups = resultingIdfSetups.filter(
    (setup, index, self) =>
      index ===
      self.findIndex(
        (s) => s.idfPath === setup.idfPath && s.toolsPath === setup.toolsPath
      )
  );

  const existingIdfSetups = (
    await Promise.all(
      resultingIdfSetups.map(async (setup) =>
        (await pathExists(setup.idfPath)) ? setup : null
      )
    )
  ).filter((setup): setup is IdfSetup => setup !== null);

  existingIdfSetups.sort((a, b) => compareVersion(b.version, a.version));

  return existingIdfSetups;
}

export async function loadIdfSetupsFromEimIdfJson() {
  const espIdfJson = await getEimIdfJson();
  if (
    !espIdfJson ||
    !espIdfJson.idfInstalled ||
    !Object.keys(espIdfJson.idfInstalled).length
  ) {
    return [];
  }

  const isVersion3 =
    espIdfJson.version && compareVersion(espIdfJson.version, "3.0") >= 0;

  const finishedInstalls = espIdfJson.idfInstalled.filter((idfInstalled) => {
    if (
      isVersion3 &&
      idfInstalled.status &&
      idfInstalled.status !== InstallationStatus.Finished
    ) {
      return false;
    }
    return true;
  });

  return Promise.all(
    finishedInstalls.map(async (idfInstalled) => {
      const idfVersion =
        idfInstalled.version || (await getEspIdfFromCMake(idfInstalled.path));
      return {
        activationScript: idfInstalled.activationScript || "",
        id: idfInstalled.id,
        idfPath: idfInstalled.path,
        isValid: false,
        gitPath: espIdfJson.gitPath,
        version: idfVersion,
        toolsPath: idfInstalled.idfToolsPath,
        python: idfInstalled.python || "",
        sysPythonPath: "",
      } as IdfSetup;
    })
  );
}

export async function getEimIdfJson() {
  const espIdeJsonCustomPath = readParameter("idf.eimIdfJsonPath") as string;
  const eimIdfJsonPath =
    espIdeJsonCustomPath && (await pathExists(espIdeJsonCustomPath))
      ? espIdeJsonCustomPath
      : process.platform === "win32"
      ? join("C:", "Espressif", "tools", "eim_idf.json")
      : join(process.env.HOME || "", ".espressif", "tools", "eim_idf.json");
  const espIdfJsonExists = await pathExists(eimIdfJsonPath);
  if (!espIdfJsonExists) {
    return;
  }
  try {
    return (await readJson(eimIdfJsonPath)) as EspIdfJson;
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : `Error reading ${eimIdfJsonPath}.`;
    Logger.error(msg, error as Error, "getEimIdfJson");
  }
}
