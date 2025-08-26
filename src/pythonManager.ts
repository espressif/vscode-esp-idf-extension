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

import { PyReqLog } from "./PyReqLog";
import { CancellationToken, Uri } from "vscode";
import * as utils from "./utils";
import { constants } from "fs-extra";
import { Logger } from "./logger/logger";
import { join } from "path";
import { OutputChannel } from "./logger/outputChannel";
import { EOL } from "os";
import { ESP } from "./config";

export async function installEspIdfToolFromIdf(
  espDir: string,
  pythonBinPath: string,
  idfToolsPath: string,
  toolName: string,
  cancelToken?: CancellationToken
) {
  const idfToolsPyPath = join(espDir, "tools", "idf_tools.py");
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_TOOLS_PATH = idfToolsPath;
  modifiedEnv.IDF_PATH = espDir;
  return new Promise<void>(async (resolve, reject) => {
    if (cancelToken && cancelToken.isCancellationRequested) {
      return reject(new Error("Process cancelled by user"));
    }
    try {
      const args = [idfToolsPyPath, "install", toolName];
      const processResult = await utils.execChildProcess(
        pythonBinPath,
        args,
        idfToolsPath,
        OutputChannel.init(),
        { cwd: idfToolsPath, env: modifiedEnv },
        cancelToken
      );
      OutputChannel.appendLine(processResult);
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
}

export async function getEnvVarsFromIdfTools(
  espIdfPath: string,
  idfToolsPath: string,
  pythonBinPath: string,
  cancelToken?: CancellationToken
) {
  const idfToolsPyPath = join(espIdfPath, "tools", "idf_tools.py");
  const args = [idfToolsPyPath, "export", "--format", "key-value"];
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_TOOLS_PATH = idfToolsPath;
  modifiedEnv.IDF_PATH = espIdfPath;
  let idfToolsDict: { [key: string]: string } = {};
  try {
    const processResult = await utils.execChildProcess(
      pythonBinPath,
      args,
      idfToolsPath,
      OutputChannel.init(),
      { cwd: idfToolsPath, env: modifiedEnv },
      cancelToken
    );
    const lines = processResult.trim().split(EOL);
    for (const l of lines) {
      let keyIndex = l.indexOf("=");
      if (keyIndex === -1) {
        continue;
      }
      let key = l.slice(0, keyIndex);
      let val = l.slice(keyIndex + 1);
      idfToolsDict[key] = val;
    }

    return idfToolsDict;
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : "Error at idf_tools.py export --format key-value";
    Logger.errorNotify(msg, error, "getEnvVarsFromIdfTools");
    return idfToolsDict;
  }
}

export async function installEspMatterPyReqs(
  workspaceFolder: Uri,
  espMatterDir: string,
  pyTracker?: PyReqLog,
  cancelToken?: CancellationToken
) {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  const opts = { env: modifiedEnv, cwd: workspaceFolder.fsPath };
  const virtualEnvPython = await getVirtualEnvPythonPath();

  const reqDoesNotExists = " doesn't exist. Make sure the path is correct.";
  const matterRequirements = join(espMatterDir, "requirements.txt");
  if (!utils.canAccessFile(matterRequirements, constants.R_OK)) {
    Logger.warnNotify(matterRequirements + reqDoesNotExists);
    OutputChannel.appendLine(matterRequirements + reqDoesNotExists);
    throw new Error();
  }
  const installMatterPyPkgsMsg = `Installing ESP-Matter python packages in ${virtualEnvPython} ...\n`;
  Logger.info(installMatterPyPkgsMsg);
  if (pyTracker) {
    pyTracker.Log = installMatterPyPkgsMsg;
  }
  OutputChannel.appendLine(installMatterPyPkgsMsg + "\n");
  const args = [
    "-m",
    "pip",
    "install",
    "--upgrade",
    "--no-warn-script-location",
    "-r",
    matterRequirements,
    "--extra-index-url",
    "https://dl.espressif.com/pypi",
  ];
  await execProcessWithLog(virtualEnvPython, args, pyTracker, opts);
  return virtualEnvPython;
}
export async function execProcessWithLog(
  cmd: string,
  args: string[],
  pyTracker?: PyReqLog,
  opts?: {
    env: NodeJS.ProcessEnv;
    cwd: string;
    cancelToken?: CancellationToken;
  }
) {
  const processResult = await utils.spawn(cmd, args, opts);
  Logger.info(processResult + "\n");
  if (pyTracker) {
    pyTracker.Log = processResult + "\n";
  }
}

export async function getVirtualEnvPythonPath() {
  const currentEnvVars = ESP.ProjectConfiguration.store.get<{
    [key: string]: string;
  }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
  if (currentEnvVars["IDF_PYTHON_ENV_PATH"]) {
    const pyDir =
      process.platform === "win32"
        ? ["Scripts", "python.exe"]
        : ["bin", "python3"];
    const venvPythonPath = join(
      currentEnvVars["IDF_PYTHON_ENV_PATH"],
      ...pyDir
    );
    return venvPythonPath;
  }
}

export async function checkPythonExists(pythonBin: string, workingDir: string) {
  try {
    const versionResult = await utils.execChildProcess(
      pythonBin,
      ["--version"],
      workingDir
    );
    if (versionResult) {
      const match = versionResult.match(/Python\s\d+(.\d+)?(.\d+)?/g);
      if (match && match.length > 0) {
        return true;
      }
    }
  } catch (error) {
    if (error && error.message) {
      const match = error.message.match(/Python\s\d+.\d+.\d+/g);
      if (match && match.length > 0) {
        return true;
      }
    }
    const newErr =
      error && error.message
        ? error
        : new Error("Python is not found in current environment");
    Logger.errorNotify(
      newErr.message,
      newErr,
      "pythonManager checkPythonExists"
    );
  }
  return false;
}

export async function checkPipExists(pyBinPath: string, workingDir: string) {
  try {
    const args = ["-m", "pip", "--version"];
    const pipResult = await utils.execChildProcess(pyBinPath, args, workingDir);
    if (pipResult) {
      const match = pipResult.match(/pip\s\d+(.\d+)?(.\d+)?/g);
      if (match && match.length > 0) {
        return true;
      }
    }
  } catch (error) {
    const newErr =
      error && error.message
        ? error
        : new Error("Pip is not found in current environment");
    Logger.error(newErr.message, newErr, "pythonManager checkPipExists");
  }
  return false;
}

export async function checkVenvExists(pyBinPath: string, workingDir: string) {
  try {
    const pipResult = await utils.execChildProcess(
      pyBinPath,
      ["-c", "import venv"],
      workingDir
    );
    return true;
  } catch (error) {
    const newErr =
      error && error.message
        ? error
        : new Error("Venv is not found in current environment");
    Logger.error(newErr.message, newErr, "pythonManager checkVenvExists");
  }
  return false;
}

export async function getPythonBinList(workingDir: string) {
  if (process.platform === "win32") {
    return [];
  } else {
    return await getUnixPythonList(workingDir);
  }
}

export async function getUnixPythonList(workingDir: string) {
  try {
    let pythonVersions: string[] = [];
    let python3Versions: string[] = [];

    try {
      pythonVersions = await utils.getAllBinPathInEnvPath(
        "python",
        process.env
      );
    } catch (pythonError) {
      Logger.warn("Error finding python versions", pythonError);
    }

    try {
      python3Versions = await utils.getAllBinPathInEnvPath(
        "python3",
        process.env
      );
    } catch (python3Error) {
      Logger.warn("Error finding python3 versions", python3Error);
    }

    const combinedVersionsArray = [...pythonVersions, ...python3Versions];
    const uniquePathsSet = new Set(
      combinedVersionsArray.filter((path) => path.length > 0)
    );
    const uniquePathsArray = Array.from(uniquePathsSet);

    return uniquePathsArray;
  } catch (error) {
    Logger.errorNotify(
      "Error looking for python in system",
      error,
      "pythonManager getUnixPythonList"
    );
    return ["Not found"];
  }
}

export async function checkIfNotVirtualEnv(
  pythonBinPath: string,
  workDir: string
) {
  try {
    const isVirtualEnv = await utils.execChildProcess(
      pythonBinPath,
      ["-c", "import sys; print(sys.prefix == sys.base_prefix)"],
      workDir
    );
    return isVirtualEnv.trim() === "True";
  } catch (error) {
    Logger.errorNotify(
      "Error checking Python is virtualenv",
      error,
      "pythonManager checkIfNotVirtualEnv"
    );
    return false;
  }
}
