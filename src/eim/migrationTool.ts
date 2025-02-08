/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 16th December 2024 5:48:20 pm
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

import { ConfigurationTarget, Uri } from "vscode";
import { readParameter, writeParameter } from "../idfConfiguration";
import { IdfToolsManager } from "../idfToolsManager";
import { dirname, join } from "path";
import { getUnixPythonList, getVirtualEnvPythonPath } from "../pythonManager";
import { execChildProcess, getEspIdfFromCMake } from "../utils";
import { IdfSetup } from "./types";
import { pathExists } from "fs-extra";
import { ESP } from "../config";
import { getIdfMd5sum } from "./checkCurrentSettings";

export async function useCustomExtraVarsAsIdfSetup(
  customExtraVars: { [key: string]: string },
  workspaceFolder: Uri
) {
  if (
    !customExtraVars["IDF_PATH"] &&
    !customExtraVars["IDF_TOOLS_PATH"] &&
    !customExtraVars["IDF_PYTHON_ENV_PATH"]
  ) {
    if (!customExtraVars["IDF_PATH"] && process.env["IDF_PATH"]) {
      customExtraVars["IDF_PATH"] = process.env["IDF_PATH"];
    }

    if (!customExtraVars["IDF_TOOLS_PATH"]) {
      const containerPath =
        process.platform === "win32"
          ? process.env.USERPROFILE
          : process.env.HOME;
      const defaultToolsPath = join(containerPath, ".espressif");
      customExtraVars["IDF_TOOLS_PATH"] =
        process.env["IDF_TOOLS_PATH"] || defaultToolsPath;
    }

    if (!customExtraVars["IDF_PYTHON_ENV_PATH"] && process.env["IDF_PATH"]) {
      customExtraVars["IDF_PYTHON_ENV_PATH"] =
        process.env["IDF_PYTHON_ENV_PATH"];
    }
    await writeParameter(
      "idf.customExtraVars",
      customExtraVars,
      ConfigurationTarget.WorkspaceFolder,
      workspaceFolder
    );
  }
  if (
    customExtraVars["IDF_PATH"] &&
    customExtraVars["IDF_TOOLS_PATH"] &&
    customExtraVars["IDF_PYTHON_ENV_PATH"]
  ) {
    const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
    const idfPathVersion = await getEspIdfFromCMake(
      customExtraVars["IDF_PATH"]
    );
    const gitPath = readParameter("idf.gitPath", workspaceFolder);
    const idfSetupId = getIdfMd5sum(customExtraVars["IDF_PATH"]);
    const currentIdfSetup: IdfSetup = {
      activationScript: "",
      id: idfSetupId,
      idfPath: customExtraVars["IDF_PATH"],
      isValid: false,
      gitPath: gitPath,
      version: idfPathVersion,
      toolsPath: customExtraVars["IDF_TOOLS_PATH"],
      sysPythonPath: "",
      python: pythonBinPath,
    };
    return currentIdfSetup;
  } else {
    return;
  }
}

export async function useExistingSettingsToMakeNewConfig(workspaceFolder: Uri) {
  const espIdfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const idfPathVersion = await getEspIdfFromCMake(espIdfPath);
  const idfToolsPath = readParameter(
    "idf.toolsPath",
    workspaceFolder
  ) as string;
  const idfToolsManager = await IdfToolsManager.createIdfToolsManager(
    espIdfPath
  );
  const exportedToolsPaths = await idfToolsManager.exportPathsInString(
    join(idfToolsPath, "tools"),
    ["cmake", "ninja"]
  );
  const exportVars = await idfToolsManager.exportVars(
    join(idfToolsPath, "tools"),
    ["cmake", "ninja"]
  );
  // FIX use system Python path as setting instead venv
  // REMOVE this line after neext release
  const sysPythonBinPath = await getSystemPython(workspaceFolder);
  let pythonBinPath = "";
  if (sysPythonBinPath) {
    pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  }

  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };

  let pathNameInEnv: string = Object.keys(process.env).find(
    (k) => k.toUpperCase() == "PATH"
  );

  const gitPath = readParameter("idf.gitPath", workspaceFolder);
  const idfSetupId = getIdfMd5sum(espIdfPath);

  customExtraVars[pathNameInEnv] = exportedToolsPaths;
  customExtraVars["ESP_IDF_VERSION"] = `v${idfPathVersion}`;
  customExtraVars["IDF_TOOLS_PATH"] = idfToolsPath;
  customExtraVars["IDF_PATH"] = espIdfPath;
  customExtraVars["IDF_PYTHON_ENV_PATH"] = dirname(dirname(pythonBinPath));
  for (const envVar in exportVars) {
    if (envVar) {
      customExtraVars[envVar] = customExtraVars[envVar];
    }
  }
  await writeParameter(
    "idf.customExtraVars",
    customExtraVars,
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );

  const currentIdfSetup: IdfSetup = {
    activationScript: "",
    id: idfSetupId,
    idfPath: espIdfPath,
    isValid: false,
    gitPath: gitPath,
    version: idfPathVersion,
    toolsPath: idfToolsPath,
    sysPythonPath: sysPythonBinPath,
    python: pythonBinPath,
  };

  return currentIdfSetup;
}

export async function computeVirtualEnvPythonPathFromIdfSetup(
  idfSetup: IdfSetup
) {
  const pythonPathExists = await pathExists(idfSetup.python);
  if (pythonPathExists) {
    return idfSetup.python;
  }
  const idfToolsPathExists = await pathExists(idfSetup.toolsPath);
  const idfPathExists = await pathExists(idfSetup.idfPath);
  const sysPythonPathExists = await pathExists(idfSetup.sysPythonPath);
  if (!idfPathExists || !idfToolsPathExists || !sysPythonPathExists) {
    return;
  }
  const virtualEnvPython = await getPythonEnvPath(
    idfSetup.idfPath,
    idfSetup.toolsPath,
    idfSetup.sysPythonPath
  );
  return virtualEnvPython;
}

export async function computeVirtualEnvPythonPath(workspaceFolder: Uri) {
  const pythonBinPath = readParameter(
    "idf.pythonBinPath",
    workspaceFolder
  ) as string;
  const pythonPathExists = await pathExists(pythonBinPath);
  if (pythonPathExists) {
    return pythonBinPath;
  }
  const sysPythonPath = readParameter(
    "idf.pythonInstallPath",
    workspaceFolder
  ) as string;
  let espIdfDir = readParameter("idf.espIdfPath", workspaceFolder) as string;
  let idfToolsDir = readParameter("idf.toolsPath", workspaceFolder) as string;
  const idfPathExists = await pathExists(espIdfDir);
  const idfToolsPathExists = await pathExists(idfToolsDir);
  const sysPythonPathExists = await pathExists(sysPythonPath);
  if (!idfPathExists || !idfToolsPathExists || !sysPythonPathExists) {
    return;
  }
  const virtualEnvPython = await getPythonEnvPath(
    espIdfDir,
    idfToolsDir,
    sysPythonPath
  );
  return virtualEnvPython;
}

export async function getSystemPythonFromIdfSetup(idfSetup: IdfSetup) {
  const doesSysPythonBinPathExist = await pathExists(idfSetup.sysPythonPath);
  if (doesSysPythonBinPathExist) {
    return idfSetup.sysPythonPath;
  }
  const pythonBinPathExists = await pathExists(idfSetup.python);
  if (pythonBinPathExists) {
    const pythonCode = `import sys; print('{}'.format(sys.base_prefix))`;
    const args = ["-c", pythonCode];
    const workingDir = __dirname;
    const pythonVersion = (
      await execChildProcess(idfSetup.python, args, workingDir)
    ).replace(/(\n|\r|\r\n)/gm, "");
    const pyDir =
      process.platform === "win32" ? ["python.exe"] : ["bin", "python3"];
    const sysPythonBinPath = join(pythonVersion, ...pyDir);
    return sysPythonBinPath;
  }

  if (process.platform !== "win32") {
    const sysPythonBinPathList = await getUnixPythonList(__dirname);
    return sysPythonBinPathList.length ? sysPythonBinPathList[0] : "python3";
  } else {
    const idfVersion = await getEspIdfFromCMake(idfSetup.idfPath);
    const pythonVersionToUse =
      idfVersion >= "5.0"
        ? ESP.URL.IDF_EMBED_PYTHON.VERSION
        : ESP.URL.OLD_IDF_EMBED_PYTHON.VERSION;
    const idfPyDestPath = join(
      idfSetup.toolsPath,
      "tools",
      "idf-python",
      pythonVersionToUse,
      "python.exe"
    );
    return idfPyDestPath;
  }
}

export async function getSystemPython(workspaceFolder: Uri) {
  let sysPythonBinPath = readParameter(
    "idf.pythonInstallPath",
    workspaceFolder
  ) as string;
  const doesSysPythonBinPathExist = await pathExists(sysPythonBinPath);
  if (doesSysPythonBinPathExist) {
    return sysPythonBinPath;
  }
  let pythonBinPath = readParameter(
    "idf.pythonBinPath",
    workspaceFolder
  ) as string;
  const pythonBinPathExists = await pathExists(pythonBinPath);
  if (pythonBinPathExists) {
    const pythonCode = `import sys; print('{}'.format(sys.base_prefix))`;
    const args = ["-c", pythonCode];
    const workingDir =
      workspaceFolder && workspaceFolder.fsPath
        ? workspaceFolder.fsPath
        : __dirname;
    const pythonVersion = (
      await execChildProcess(pythonBinPath, args, workingDir)
    ).replace(/(\n|\r|\r\n)/gm, "");
    const pyDir =
      process.platform === "win32" ? ["python.exe"] : ["bin", "python3"];
    sysPythonBinPath = join(pythonVersion, ...pyDir);
    return sysPythonBinPath;
  }

  if (process.platform !== "win32") {
    const sysPythonBinPathList = await getUnixPythonList(__dirname);
    return sysPythonBinPathList.length ? sysPythonBinPathList[0] : "python3";
  } else {
    const idfPathDir = readParameter("idf.espIdfPath", workspaceFolder);
    const idfToolsDir = readParameter(
      "idf.toolsPath",
      workspaceFolder
    ) as string;
    const idfVersion = await getEspIdfFromCMake(idfPathDir);
    const pythonVersionToUse =
      idfVersion >= "5.0"
        ? ESP.URL.IDF_EMBED_PYTHON.VERSION
        : ESP.URL.OLD_IDF_EMBED_PYTHON.VERSION;
    const idfPyDestPath = join(
      idfToolsDir,
      "tools",
      "idf-python",
      pythonVersionToUse,
      "python.exe"
    );
    return idfPyDestPath;
  }
}

export async function getIdfPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const pythonCode = `import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))`;
  const args = ["-c", pythonCode];
  const pythonVersion = (
    await execChildProcess(pythonBin, args, espIdfDir)
  ).replace(/(\n|\r|\r\n)/gm, "");
  const fullEspIdfVersion = await getEspIdfFromCMake(espIdfDir);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const resultVersion = `idf${espIdfVersion}_py${pythonVersion}_env`;
  return join(idfToolsDir, "python_env", resultVersion);
}

export async function getPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const idfPyEnvPath = await getIdfPythonEnvPath(
    espIdfDir,
    idfToolsDir,
    pythonBin
  );
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const fullIdfPyEnvPath = join(idfPyEnvPath, ...pyDir);
  const pyEnvPathExists = await pathExists(fullIdfPyEnvPath);
  return pyEnvPathExists ? fullIdfPyEnvPath : "";
}
