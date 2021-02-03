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

export async function installPythonEnv(
  espDir: string,
  idfToolsDir: string,
  pyTracker: PyReqLog,
  pythonBinPath: string,
  channel?: OutputChannel,
  cancelToken?: CancellationToken
) {
  const isInsideVirtualEnv = await utils.execChildProcess(
    `"${pythonBinPath}" -c "import sys; print(hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix))"`,
    idfToolsDir,
    channel
  );
  if (isInsideVirtualEnv.replace(EOL, "") === "True") {
    const inVenvMsg = `Using existing virtual environment ${pythonBinPath}. Installing Python requirements...`;
    pyTracker.Log = inVenvMsg;
    if (channel) {
      channel.appendLine(inVenvMsg);
    }
    await installReqs(espDir, pythonBinPath, idfToolsDir, pyTracker, channel);
    return pythonBinPath;
  }

  const pyEnvPath = await getPythonEnvPath(espDir, idfToolsDir, pythonBinPath);
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const virtualEnvPython = path.join(pyEnvPath, ...pyDir);

  const creatEnvMsg = `Creating a new Python environment in ${pyEnvPath} ...\n`;

  if (
    pythonBinPath.indexOf(virtualEnvPython) < 0 &&
    utils.fileExists(virtualEnvPython)
  ) {
    await installExtensionPyReqs(
      virtualEnvPython,
      idfToolsDir,
      pyTracker,
      channel,
      cancelToken
    );
    return virtualEnvPython;
  }

  pyTracker.Log = creatEnvMsg;
  if (channel) {
    channel.appendLine(creatEnvMsg);
  }

  let envModule: string;
  try {
    const pythonVersion = (
      await utils.execChildProcess(
        `"${pythonBinPath}" -c "import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))"`,
        espDir,
        channel,
        undefined,
        cancelToken
      )
    ).replace(/(\n|\r|\r\n)/gm, "");
    envModule =
      pythonVersion.localeCompare("3.3") !== -1 ? "venv" : "virtualenv";
    if (envModule.indexOf("virtualenv") !== -1) {
      const checkVirtualEnv = await utils.execChildProcess(
        `"${pythonBinPath}" -c "import virtualenv"`,
        idfToolsDir,
        channel,
        undefined,
        cancelToken
      );
    }
  } catch (error) {
    if (error && error.message.indexOf("ModuleNotFoundError") !== -1) {
      await execProcessWithLog(
        `"${pythonBinPath}" -m pip install --user virtualenv`,
        idfToolsDir,
        pyTracker,
        channel,
        undefined,
        cancelToken
      );
    }
  }
  await execProcessWithLog(
    `"${pythonBinPath}" -m ${envModule} "${pyEnvPath}"`,
    idfToolsDir,
    pyTracker,
    channel,
    undefined,
    cancelToken
  );
  await installReqs(
    espDir,
    virtualEnvPython,
    idfToolsDir,
    pyTracker,
    channel,
    cancelToken
  );
  return virtualEnvPython;
}

export async function installReqs(
  espDir: string,
  virtualEnvPython: string,
  idfToolsDir: string,
  pyTracker?: PyReqLog,
  channel?: OutputChannel,
  cancelToken?: CancellationToken
) {
  const installPyPkgsMsg = `Installing ESP-IDF python packages in ${virtualEnvPython} ...\n`;
  if (pyTracker) {
    pyTracker.Log = installPyPkgsMsg;
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install wheel`,
    idfToolsDir,
    pyTracker,
    channel,
    undefined,
    cancelToken
  );
  const requirements = path.join(espDir, "requirements.txt");
  const reqDoesNotExists = " doesn't exist. Make sure the path is correct.";
  if (!utils.canAccessFile(requirements, constants.R_OK)) {
    Logger.warnNotify(requirements + reqDoesNotExists);
    if (channel) {
      channel.appendLine(requirements + reqDoesNotExists);
    }
    return;
  }
  const modifiedEnv = Object.assign({}, process.env);
  modifiedEnv.IDF_PATH = espDir;
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --no-warn-script-location -r "${requirements}"`,
    idfToolsDir,
    pyTracker,
    channel,
    { env: modifiedEnv }
  );
  await installExtensionPyReqs(
    virtualEnvPython,
    idfToolsDir,
    pyTracker,
    channel,
    cancelToken
  );
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
  const installDAPyPkgsMsg = `Installing ESP-IDF Debug Adapter python packages in ${virtualEnvPython} ...\n`;
  const installExtensionPyPkgsMsg = `Installing ESP-IDF extension python packages in ${virtualEnvPython} ...\n`;
  if (pyTracker) {
    pyTracker.Log = installExtensionPyPkgsMsg;
  }
  if (channel) {
    channel.appendLine(installExtensionPyPkgsMsg + "\n");
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --no-warn-script-location  -r "${extensionRequirements}"`,
    idfToolsDir,
    pyTracker,
    channel,
    undefined,
    cancelToken
  );
  if (pyTracker) {
    pyTracker.Log = installDAPyPkgsMsg;
  }
  if (channel) {
    channel.appendLine(installDAPyPkgsMsg + "\n");
  }
  await execProcessWithLog(
    `"${virtualEnvPython}" -m pip install --no-warn-script-location -r "${debugAdapterRequirements}"`,
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
