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

import { pathExists, readJson, stat } from "fs-extra";
import { join, resolve } from "path";
import { createHash } from "crypto";
import {
  EspIdfJson,
  IdfInstalled,
  IdfSetup,
  InstallationStatus,
} from "./types";
import { readParameter } from "../configuration/idf";
import { getVenvPythonBinPath } from "../configuration/env";
import {
  currentSetupNotFinishedDetail,
  installStatusDetail,
  missingActivationScriptDetail,
} from "./setupFailureDetail";
import { Logger } from "../common/logger";
import { compareVersion, getEspIdfFromCMake } from "../utils";
import { loadIdfSetupsFromEspIdfJson } from "./migrationTool";
import { WorkspaceFolder } from "vscode";

export function defaultEimIdfJsonPath() {
  return process.platform === "win32"
    ? join("C:", "Espressif", "tools", "eim_idf.json")
    : join(process.env.HOME || "", ".espressif", "tools", "eim_idf.json");
}

const maxUnfinishedDetails = 3;

export async function idfInstallRejectReason(
  espIdfJson: EspIdfJson,
  idfInstalled: IdfInstalled
): Promise<string | undefined> {
  const isVersion3 =
    !!espIdfJson.version && compareVersion(espIdfJson.version, "3.0") >= 0;
  if (
    isVersion3 &&
    idfInstalled.status &&
    idfInstalled.status !== InstallationStatus.Finished
  ) {
    return installStatusDetail(idfInstalled.path, idfInstalled.status);
  }
  if (
    idfInstalled.activationScript &&
    !(await pathExists(idfInstalled.activationScript))
  ) {
    return missingActivationScriptDetail(
      idfInstalled.path,
      idfInstalled.activationScript
    );
  }
  return undefined;
}

export async function isFinishedIdfInstall(
  espIdfJson: EspIdfJson,
  idfInstalled: IdfInstalled
): Promise<boolean> {
  return !(await idfInstallRejectReason(espIdfJson, idfInstalled));
}

export async function unfinishedInstallDetails(
  espIdfJson: EspIdfJson
): Promise<string | undefined> {
  if (!Array.isArray(espIdfJson.idfInstalled)) {
    return;
  }
  const details: string[] = [];
  for (const idfInstalled of espIdfJson.idfInstalled) {
    const detail = await idfInstallRejectReason(espIdfJson, idfInstalled);
    if (!detail) {
      continue;
    }
    details.push(detail);
    if (details.length === maxUnfinishedDetails) {
      break;
    }
  }
  if (!details.length) {
    return;
  }
  return details.join("\n");
}

export async function currentSetupRejectDetail(
  espIdfJson: EspIdfJson,
  currentSetup: string
): Promise<string> {
  const matchingInstall = Array.isArray(espIdfJson.idfInstalled)
    ? espIdfJson.idfInstalled.find((install) => install.path === currentSetup)
    : undefined;
  if (!matchingInstall) {
    return currentSetupNotFinishedDetail(currentSetup);
  }
  return (
    (await idfInstallRejectReason(espIdfJson, matchingInstall)) ||
    currentSetupNotFinishedDetail(currentSetup)
  );
}

export async function finishedIdfInstalls(
  espIdfJson: EspIdfJson
): Promise<IdfInstalled[]> {
  if (!Array.isArray(espIdfJson.idfInstalled)) {
    return [];
  }
  const installs = await Promise.all(
    espIdfJson.idfInstalled.map(async (idfInstalled) =>
      (await isFinishedIdfInstall(espIdfJson, idfInstalled))
        ? idfInstalled
        : undefined
    )
  );
  return installs.filter((install): install is IdfInstalled => !!install);
}

async function isExistingFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function resolveEimIdfJsonCandidates(
  customPath: string | undefined,
  defaultPath: string
): Promise<string | undefined> {
  if (customPath && (await isExistingFile(customPath))) {
    return customPath;
  }
  if (customPath) {
    const nestedPath = join(customPath, "eim_idf.json");
    if (await isExistingFile(nestedPath)) {
      return nestedPath;
    }
  }
  if (await isExistingFile(defaultPath)) {
    return defaultPath;
  }
  return undefined;
}

export async function resolveEimIdfJsonPath(): Promise<string | undefined> {
  const customPath = (readParameter("idf.eimIdfJsonPath") as string) || "";
  return resolveEimIdfJsonCandidates(
    customPath || undefined,
    defaultEimIdfJsonPath()
  );
}

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
  return {
    id: idfSetupIdFromPath(idfPath),
    activationScript: "",
    idfPath,
    gitPath: "",
    isValid,
    version: await getEspIdfFromCMake(idfPath),
    toolsPath: idfToolsPath,
    python: pythonEnvPath ? getVenvPythonBinPath(pythonEnvPath) : "",
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
  if (!espIdfJson) {
    return [];
  }
  const finishedInstalls = await finishedIdfInstalls(espIdfJson);
  if (!finishedInstalls.length) {
    return [];
  }

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
  const eimIdfJsonPath = await resolveEimIdfJsonPath();
  if (!eimIdfJsonPath) {
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
