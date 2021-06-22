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
import { CancellationToken, OutputChannel } from "vscode";
import * as utils from "./utils";
import * as del from "del";
import { constants, pathExists } from "fs-extra";
import { EOL } from "os";
import { Logger } from "./logger/logger";
import path from "path";

export async function installPythonEnvFromIdfTools(
  espDir: string,
  idfToolsDir: string,
  pyTracker: PyReqLog,
  pythonBinPath: string,
  channel?: OutputChannel,
  cancelToken?: CancellationToken
) {
  const idfToolsPyPath = path.join(espDir, "tools", "idf_tools.py");
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_TOOLS_PATH = idfToolsDir;
  modifiedEnv.IDF_PATH = espDir;
  await execProcessWithLog(
    `${pythonBinPath} ${idfToolsPyPath} install-python-env`,
    idfToolsDir,
    pyTracker,
    channel,
    { env: modifiedEnv },
    cancelToken
  );
  const pyEnvPath = await getPythonEnvPath(espDir, idfToolsDir, pythonBinPath);
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const virtualEnvPython = path.join(pyEnvPath, ...pyDir);
  await installExtensionPyReqs(
    virtualEnvPython,
    idfToolsDir,
    pyTracker,
    channel,
    cancelToken
  );
  return virtualEnvPython;
}

export async function installExtensionPyReqs(
  virtualEnvPython: string,
  idfToolsDir: string,
  pyTracker?: PyReqLog,
  channel?: OutputChannel,
  cancelToken?: CancellationToken
) {
  const reqDoesNotExists = " doesn't exist. Make sure the path is correct.";
  const debugAdapterRequirements = path.join(
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
  const extensionRequirements = path.join(
    utils.extensionContext.extensionPath,
    "requirements.txt"
  );
  if (!utils.canAccessFile(extensionRequirements, constants.R_OK)) {
    Logger.warnNotify(extensionRequirements + reqDoesNotExists);
    if (channel) {
      channel.appendLine(extensionRequirements + reqDoesNotExists);
    }
    return;
  }
  const installExtensionPyPkgsMsg = `Installing ESP-IDF extension python packages in ${virtualEnvPython} ...\n`;
  if (pyTracker) {
    pyTracker.Log = installExtensionPyPkgsMsg;
  }
  if (channel) {
    channel.appendLine(installExtensionPyPkgsMsg + "\n");
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --upgrade --no-warn-script-location  -r "${extensionRequirements}"`,
    idfToolsDir,
    pyTracker,
    channel,
    undefined,
    cancelToken
  );
  const installDAPyPkgsMsg = `Installing ESP-IDF Debug Adapter python packages in ${virtualEnvPython} ...\n`;
  if (pyTracker) {
    pyTracker.Log = installDAPyPkgsMsg;
  }
  if (channel) {
    channel.appendLine(installDAPyPkgsMsg + "\n");
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --upgrade --no-warn-script-location -r "${debugAdapterRequirements}"`,
    idfToolsDir,
    pyTracker,
    channel,
    undefined,
    cancelToken
  );
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
  const fullEspIdfVersion = await utils.getEspIdfVersion(espIdfDir);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const resultVersion = `idf${espIdfVersion}_py${pythonVersion}_env`;
  const idfPyEnvPath = path.join(idfToolsDir, "python_env", resultVersion);

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
    Logger.errorNotify(newErr.message, newErr);
  }
  return false;
}

export async function getPythonBinList(workingDir: string) {
  if (process.platform === "win32") {
    return await getPythonBinListWindows(workingDir);
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
      return resultList;
    }
  } catch (error) {
    Logger.errorNotify("Error looking for python in system", error);
    return ["Not found"];
  }
}

export async function getPythonBinListWindows(workingDir: string) {
  const paths: string[] = [];
  const registryRootLocations = [
    "HKEY_CURRENT_USER\\SOFTWARE\\PYTHON",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\PYTHON",
    "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432NODE\\PYTHON",
  ];
  for (const root of registryRootLocations) {
    try {
      const rootResult = await utils.execChildProcess(
        "reg query " + root,
        workingDir
      );
      if (!rootResult.trim()) {
        continue;
      }
      const companies = rootResult.trim().split("\r\n");
      for (const company of companies) {
        if (company.indexOf("PyLauncher") !== -1) {
          continue;
        }
        const companyResult = await utils.execChildProcess(
          "reg query " + company,
          workingDir
        );
        if (!companyResult.trim()) {
          continue;
        }
        const tags = companyResult.trim().split("\r\n");
        const keyValues = await utils.execChildProcess(
          "reg query " + tags[tags.length - 1],
          workingDir
        );
        if (!keyValues.trim()) {
          continue;
        }
        const values = keyValues.trim().split("\r\n");
        for (const val of values) {
          if (val.indexOf("InstallPath") !== -1) {
            const installPaths = await utils.execChildProcess(
              "reg query " + val,
              workingDir
            );
            const binPaths = installPaths.trim().split("\r\n");
            for (const iPath of binPaths) {
              const trimPath = iPath.trim().split(/\s{2,}/);
              if (trimPath[0] === "ExecutablePath") {
                paths.push(trimPath[trimPath.length - 1]);
              }
            }
          }
        }
      }
    } catch (error) {
      Logger.error("Error looking for python in windows", error);
    }
  }
  if (paths.length === 0) {
    return ["Not found"];
  }
  return paths;
}
