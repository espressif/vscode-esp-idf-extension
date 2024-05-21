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
import { CancellationToken, ExtensionContext, OutputChannel } from "vscode";
import * as utils from "./utils";
import { constants, pathExists } from "fs-extra";
import { Logger } from "./logger/logger";
import { delimiter, dirname, join, sep } from "path";

export async function installEspIdfToolFromIdf(
  espDir: string,
  pythonBinPath: string,
  idfToolsPath: string,
  toolName: string,
  toolVersion: string,
  channel?: OutputChannel,
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
      const processResult = await utils.execChildProcess(
        `"${pythonBinPath}" ${idfToolsPyPath} install ${toolName}`,
        idfToolsPath,
        channel,
        { cwd: idfToolsPath, env: modifiedEnv },
        cancelToken
      );
      if (channel) {
        channel.appendLine(processResult);
      }
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
}

export async function installPythonEnvFromIdfTools(
  espDir: string,
  idfToolsDir: string,
  pyTracker: PyReqLog,
  pythonBinPath: string,
  gitPath: string,
  context: ExtensionContext,
  channel?: OutputChannel,
  cancelToken?: CancellationToken
) {
  const idfToolsPyPath = join(espDir, "tools", "idf_tools.py");
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_TOOLS_PATH = idfToolsDir;
  modifiedEnv.IDF_PATH = espDir;
  if (process.platform === "win32") {
    let pathToGitDir: string;
    if (gitPath && gitPath !== "git") {
      pathToGitDir = dirname(gitPath);
    }
    const pathNameInEnv: string = Object.keys(process.env).find(
      (k) => k.toUpperCase() == "PATH"
    );
    if (pathToGitDir) {
      modifiedEnv[pathNameInEnv] =
        pathToGitDir + delimiter + modifiedEnv[pathNameInEnv];
    }
    modifiedEnv.PYTHONNOUSERSITE = "1";
    modifiedEnv[pathNameInEnv] =
      dirname(pythonBinPath) +
      sep +
      "Lib" +
      delimiter +
      modifiedEnv[pathNameInEnv];
    const collection = context.environmentVariableCollection;
    collection.prepend(pathNameInEnv, join(dirname(pythonBinPath), "Lib"), {
      applyAtShellIntegration: true,
      applyAtProcessCreation: true,
    });
  }

  const pyEnvPath = await getPythonEnvPath(espDir, idfToolsDir, pythonBinPath);

  await execProcessWithLog(
    `"${pythonBinPath}" "${idfToolsPyPath}" install-python-env`,
    idfToolsDir,
    pyTracker,
    channel,
    { env: modifiedEnv },
    cancelToken
  );

  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const virtualEnvPython = join(pyEnvPath, ...pyDir);
  return virtualEnvPython;
}

export async function installExtensionPyReqs(
  virtualEnvPython: string,
  espDir: string,
  idfToolsDir: string,
  pyTracker?: PyReqLog,
  channel?: OutputChannel,
  opts?: { env: NodeJS.ProcessEnv; cwd?: string },
  cancelToken?: CancellationToken
) {
  const reqDoesNotExists = " doesn't exist. Make sure the path is correct.";
  const debugAdapterRequirements = join(
    utils.extensionContext.extensionPath,
    "esp_debug_adapter",
    "requirements.txt"
  );
  if (!utils.canAccessFile(debugAdapterRequirements, constants.R_OK)) {
    Logger.warnNotify(debugAdapterRequirements + reqDoesNotExists);
    if (channel) {
      channel.appendLine(debugAdapterRequirements + reqDoesNotExists);
    }
    return;
  }
  const espIdfVersion = await utils.getEspIdfFromCMake(espDir);
  const constrainsFile = join(
    idfToolsDir,
    `espidf.constraints.v${espIdfVersion}.txt`
  );
  const constrainsFileExists = await pathExists(constrainsFile);
  let constraintArg = "";
  if (constrainsFileExists) {
    constraintArg = `--constraint "${constrainsFile}" `;
  } else {
    const extensionConstraintsFile = join(
      utils.extensionContext.extensionPath,
      `espidf.constraints.txt`
    );
    const extensionConstraintsFileExists = await pathExists(
      extensionConstraintsFile
    );
    if (extensionConstraintsFileExists) {
      constraintArg = `--constraint "${extensionConstraintsFile}" `;
    }
  }
  const installDAPyPkgsMsg = `Installing ESP-IDF Debug Adapter python packages in ${virtualEnvPython} ...\n`;
  Logger.info(installDAPyPkgsMsg + "\n");
  if (pyTracker) {
    pyTracker.Log = installDAPyPkgsMsg;
  }
  if (channel) {
    channel.appendLine(installDAPyPkgsMsg + "\n");
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --upgrade ${constraintArg}--no-warn-script-location -r "${debugAdapterRequirements}"`,
    idfToolsDir,
    pyTracker,
    channel,
    opts,
    cancelToken
  );
}

export async function installEspMatterPyReqs(
  espDir: string,
  idfToolsDir: string,
  espMatterDir: string,
  pythonBinPath: string,
  pyTracker?: PyReqLog,
  channel?: OutputChannel,
  cancelToken?: CancellationToken
) {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  const opts = { env: modifiedEnv };
  const pyEnvPath = await getPythonEnvPath(espDir, idfToolsDir, pythonBinPath);
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const virtualEnvPython = join(pyEnvPath, ...pyDir);

  const reqDoesNotExists = " doesn't exist. Make sure the path is correct.";
  const matterRequirements = join(espMatterDir, "requirements.txt");
  if (!utils.canAccessFile(matterRequirements, constants.R_OK)) {
    Logger.warnNotify(matterRequirements + reqDoesNotExists);
    if (channel) {
      channel.appendLine(matterRequirements + reqDoesNotExists);
    }
    throw new Error();
  }
  const installMatterPyPkgsMsg = `Installing ESP-Matter python packages in ${virtualEnvPython} ...\n`;
  Logger.info(installMatterPyPkgsMsg);
  if (pyTracker) {
    pyTracker.Log = installMatterPyPkgsMsg;
  }
  if (channel) {
    channel.appendLine(installMatterPyPkgsMsg + "\n");
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --upgrade --no-warn-script-location -r "${matterRequirements}"`,
    idfToolsDir,
    pyTracker,
    channel,
    opts,
    cancelToken
  );
  return virtualEnvPython;
}
export async function execProcessWithLog(
  cmd: string,
  workDir: string,
  pyTracker?: PyReqLog,
  channel?: OutputChannel,
  opts?: { env: NodeJS.ProcessEnv },
  cancelToken?: CancellationToken
) {
  const processResult = await utils.execChildProcess(
    cmd,
    workDir,
    channel,
    opts,
    cancelToken
  );
  Logger.info(processResult + "\n");
  if (pyTracker) {
    pyTracker.Log = processResult + "\n";
  }
  if (channel) {
    channel.appendLine(processResult + "\n");
  }
}

export async function getPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const pythonVersion = (
    await utils.execChildProcess(
      `"${pythonBin}" -c "import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))"`,
      espIdfDir
    )
  ).replace(/(\n|\r|\r\n)/gm, "");
  const fullEspIdfVersion = await utils.getEspIdfFromCMake(espIdfDir);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const resultVersion = `idf${espIdfVersion}_py${pythonVersion}_env`;
  const idfPyEnvPath = join(idfToolsDir, "python_env", resultVersion);

  return idfPyEnvPath;
}

export async function checkPythonExists(pythonBin: string, workingDir: string) {
  try {
    const versionResult = await utils.execChildProcess(
      `"${pythonBin}" --version`,
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
    Logger.errorNotify(newErr.message, newErr);
  }
  return false;
}

export async function checkPipExists(pyBinPath: string, workingDir: string) {
  try {
    const pipResult = await utils.execChildProcess(
      `"${pyBinPath}" -m pip --version`,
      workingDir
    );
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
    Logger.error(newErr.message, newErr);
  }
  return false;
}

export async function checkVenvExists(pyBinPath: string, workingDir: string) {
  try {
    const pipResult = await utils.execChildProcess(
      `"${pyBinPath}" -c "import venv"`,
      workingDir
    );
    return true;
  } catch (error) {
    const newErr =
      error && error.message
        ? error
        : new Error("Venv is not found in current environment");
    Logger.error(newErr.message, newErr);
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
    const pyVersionsStr = await utils.execChildProcess(
      "which -a python; which -a python3",
      workingDir
    );
    if (pyVersionsStr) {
      const resultList = pyVersionsStr.trim().split("\n");
      const uniquePathsSet = new Set(resultList);
      const uniquePathsArray = Array.from(uniquePathsSet);
      return uniquePathsArray;
    }
  } catch (error) {
    Logger.errorNotify("Error looking for python in system", error);
    return ["Not found"];
  }
}

export async function checkIfNotVirtualEnv(
  pythonBinPath: string,
  workDir: string
) {
  try {
    const isVirtualEnvBuffer = await utils.execChildProcess(
      `"${pythonBinPath}" -c "import sys; print('{}'.format(sys.prefix == sys.base_prefix))"`,
      workDir
    );
    return isVirtualEnvBuffer.toString().indexOf("True") !== -1 ? true : false;
  } catch (error) {
    Logger.errorNotify("Error checking Python is virtualenv", error);
    return false;
  }
}
