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
import {
  CancellationToken,
  ConfigurationTarget,
  ExtensionContext,
  Uri,
} from "vscode";
import * as utils from "./utils";
import { constants, pathExists } from "fs-extra";
import { Logger } from "./logger/logger";
import { delimiter, dirname, join, sep } from "path";
import { OutputChannel } from "./logger/outputChannel";
import { readParameter, writeParameter } from "./idfConfiguration";
import { ESP } from "./config";
import { EOL } from "os";

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
  const processResult = await utils.execChildProcess(
    pythonBinPath,
    args,
    idfToolsPath,
    OutputChannel.init(),
    { cwd: idfToolsPath, env: modifiedEnv },
    cancelToken
  );

  let idfToolsDict: { [key: string]: string } = {};
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
}

export async function installPythonEnvFromIdfTools(
  espDir: string,
  idfToolsDir: string,
  pyTracker: PyReqLog,
  pythonBinPath: string,
  gitPath: string,
  context: ExtensionContext,
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

  await execProcessWithLog(
    pythonBinPath,
    [idfToolsPyPath, "install-python-env"],
    pyTracker,
    { env: modifiedEnv, cwd: idfToolsDir },
    cancelToken
  );

  const virtualEnvPython = await getPythonEnvPath(
    espDir,
    idfToolsDir,
    pythonBinPath
  );
  return virtualEnvPython;
}

export async function installExtensionPyReqs(
  virtualEnvPython: string,
  espDir: string,
  idfToolsDir: string,
  pyTracker?: PyReqLog,
  opts?: { env: NodeJS.ProcessEnv; cwd: string },
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
    OutputChannel.appendLine(debugAdapterRequirements + reqDoesNotExists);
    return;
  }
  const fullEspIdfVersion = await utils.getEspIdfFromCMake(espDir);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const constrainsFile = join(
    idfToolsDir,
    `espidf.constraints.v${espIdfVersion}.txt`
  );
  const constrainsFileExists = await pathExists(constrainsFile);
  let constraintArg = [];
  if (constrainsFileExists) {
    constraintArg = ["--constraint", constrainsFile];
  } else {
    const extensionConstraintsFile = join(
      utils.extensionContext.extensionPath,
      "espidf.constraints.txt"
    );
    const extensionConstraintsFileExists = await pathExists(
      extensionConstraintsFile
    );
    if (extensionConstraintsFileExists) {
      constraintArg = ["--constraint", extensionConstraintsFile];
    }
  }
  const installDAPyPkgsMsg = `Installing ESP-IDF Debug Adapter python packages in ${virtualEnvPython} ...\n`;
  Logger.info(installDAPyPkgsMsg + "\n");
  if (pyTracker) {
    pyTracker.Log = installDAPyPkgsMsg;
  }
  OutputChannel.appendLine(installDAPyPkgsMsg + "\n");
  const args = [
    "-m",
    "pip",
    "install",
    "--upgrade",
    ...constraintArg,
    "--no-warn-script-location",
    "-r",
    debugAdapterRequirements,
    "--extra-index-url",
    "https://dl.espressif.com/pypi",
  ];
  await execProcessWithLog(
    virtualEnvPython,
    args,
    pyTracker,
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
  cancelToken?: CancellationToken
) {
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  const opts = { env: modifiedEnv, cwd: idfToolsDir };
  const virtualEnvPython = await getPythonEnvPath(
    espDir,
    idfToolsDir,
    pythonBinPath
  );

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
  await execProcessWithLog(
    virtualEnvPython,
    args,
    pyTracker,
    opts,
    cancelToken
  );
  return virtualEnvPython;
}
export async function execProcessWithLog(
  cmd: string,
  args: string[],
  pyTracker?: PyReqLog,
  opts?: { env: NodeJS.ProcessEnv; cwd: string },
  cancelToken?: CancellationToken
) {
  const processResult = await utils.spawn(
    cmd,
    args,
    opts,
    undefined,
    undefined,
    cancelToken,
    undefined
  );
  Logger.info(processResult + "\n");
  if (pyTracker) {
    pyTracker.Log = processResult + "\n";
  }
}

export async function getVirtualEnvPythonPath(workspaceFolder: Uri) {
  let pythonPath = readParameter(
    "idf.pythonInstallPath",
    workspaceFolder
  ) as string;
  let espIdfDir = readParameter("idf.espIdfPath", workspaceFolder) as string;
  let idfToolsDir = readParameter("idf.toolsPath", workspaceFolder) as string;
  const idfPathExists = await pathExists(espIdfDir);
  const idfToolsPathExists = await pathExists(idfToolsDir);
  const pythonPathExists = await pathExists(pythonPath);
  if (!idfPathExists || !idfToolsPathExists || !pythonPathExists) {
    return;
  }
  const virtualEnvPython = await getPythonEnvPath(
    espIdfDir,
    idfToolsDir,
    pythonPath
  );
  return virtualEnvPython;
}

export async function getPythonPath(workspaceFolder: Uri) {
  let sysPythonBinPath = readParameter(
    "idf.pythonInstallPath",
    workspaceFolder
  ) as string;
  const doesSysPythonBinPathExist = await pathExists(sysPythonBinPath);
  if (!doesSysPythonBinPathExist) {
    sysPythonBinPath = await getSystemPython(workspaceFolder);
    if (sysPythonBinPath) {
      await writeParameter(
        "idf.pythonInstallPath",
        sysPythonBinPath,
        workspaceFolder
          ? ConfigurationTarget.WorkspaceFolder
          : ConfigurationTarget.Global,
        workspaceFolder
      );
    }
  }
  return sysPythonBinPath;
}

export async function getSystemPython(workspaceFolder: Uri) {
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
      await utils.execChildProcess(pythonBinPath, args, workingDir)
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
    const idfPathDir = readParameter("idf.espIdfPath", workspaceFolder);
    const idfToolsDir = readParameter(
      "idf.toolsPath",
      workspaceFolder
    ) as string;
    const idfVersion = await utils.getEspIdfFromCMake(idfPathDir);
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
    const idfPyDestExists = await pathExists(idfPyDestPath);
    return idfPyDestExists ? idfPyDestPath : "";
  }
}

export async function getPythonEnvPath(
  espIdfDir: string,
  idfToolsDir: string,
  pythonBin: string
) {
  const pythonCode = `import sys; print('{}.{}'.format(sys.version_info.major, sys.version_info.minor))`;
  const args = ["-c", pythonCode];
  const pythonVersion = (
    await utils.execChildProcess(pythonBin, args, espIdfDir)
  ).replace(/(\n|\r|\r\n)/gm, "");
  const fullEspIdfVersion = await utils.getEspIdfFromCMake(espIdfDir);
  const majorMinorMatches = fullEspIdfVersion.match(/([0-9]+\.[0-9]+).*/);
  const espIdfVersion =
    majorMinorMatches && majorMinorMatches.length > 0
      ? majorMinorMatches[1]
      : "x.x";
  const resultVersion = `idf${espIdfVersion}_py${pythonVersion}_env`;
  const idfPyEnvPath = join(idfToolsDir, "python_env", resultVersion);
  const pyDir =
    process.platform === "win32"
      ? ["Scripts", "python.exe"]
      : ["bin", "python"];
  const fullIdfPyEnvPath = join(idfPyEnvPath, ...pyDir);

  return fullIdfPyEnvPath;
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
      const pythonVersionsRaw = await utils.execChildProcess(
        "which",
        ["-a", "python"],
        workingDir
      );
      pythonVersions = pythonVersionsRaw.trim()
        ? pythonVersionsRaw.trim().split("\n")
        : [];
    } catch (pythonError) {
      Logger.warn("Error finding python versions", pythonError);
    }

    try {
      const python3VersionsRaw = await utils.execChildProcess(
        "which",
        ["-a", "python3"],
        workingDir
      );
      python3Versions = python3VersionsRaw.trim()
        ? python3VersionsRaw.trim().split("\n")
        : [];
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
