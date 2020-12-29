/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd December 2020 4:35:32 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { exec, ExecOptions } from "child_process";
import { constants, pathExists, readJSON, writeFile } from "fs-extra";
import { EOL } from "os";
import { delimiter, join } from "path";
import * as vscode from "vscode";
import { IdfToolsManager } from "../idfToolsManager";
import { Logger } from "../logger/logger";
import { OutputChannel } from "../logger/outputChannel";
import { PlatformInformation } from "../PlatformInformation";
import { canAccessFile } from "../utils";

const GIT_VERSION_REGEX = /(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g;
const PIP_VERSION_REGEX = /pip\s\d+(.\d+)?(.\d+)?/g;
const PYTHON_VERSION_REGEX = /Python\s\d+(.\d+)?(.\d+)?/g;
const ESP_IDF_VERSION_REGEX = /v(\d+)(?:\.)?(\d+)?(?:\.)?(\d+)?.*/;

export function execChildProcess(
  cmd: string,
  pathWhereToExecute: string,
  opts?: ExecOptions
) {
  if (!opts) {
    opts = {
      cwd: pathWhereToExecute,
      maxBuffer: 500 * 1024,
    };
  }
  return new Promise<string>((resolve, reject) => {
    exec(cmd, opts, (error: Error, stdout: string, stderr: string) => {
      if (error) {
        return reject(error);
      }
      if (stderr && stderr.length) {
        return resolve("".concat(stderr, stdout));
      }
      return resolve(stdout);
    });
  });
}

export interface ConfigurationAccess {
  espIdfPath: boolean;
  espIdfToolsPaths: { [key: string]: boolean };
  pythonBinPath: boolean;
  cmakeInEnv: boolean;
  ninjaInEnv: boolean;
  toolsPath: boolean;
}
export interface Configuration {
  systemEnvPath: string;
  espIdfPath: string;
  customExtraPaths: string;
  customExtraVars: string;
  pythonBinPath: string;
  pythonPackages: pyPkgVersion[];
  serialPort: string;
  openOcdConfigs: string[];
  toolsPath: string;
}

export interface pyPkgVersion {
  name: string;
  version: string;
}

export interface idfToolResult {
  actual: string;
  doesToolExist: boolean;
  expected: string;
  id: string;
}

export interface execResult {
  output: string;
  result: string;
}

export interface reportObj {
  configurationSettings: Configuration;
  configurationAccess: ConfigurationAccess;
  espIdfToolsVersions: idfToolResult[];
  espIdfVersion: execResult;
  gitVersion: execResult;
  latestError: Error;
  pipVersion: execResult;
  pythonVersion: execResult;
  pythonPackages: execResult;
  idfCheckRequirements: execResult;
}

export async function generateConfigurationReport(
  context: vscode.ExtensionContext
) {
  const reportedResult: reportObj = {} as reportObj;
  try {
    getConfigurationSettings(reportedResult);
    await getConfigurationAccess(reportedResult, context);
    await getGitVersion(reportedResult, context);
    await getEspIdfVersion(reportedResult);
    await getPythonVersion(reportedResult, context);
    await getPipVersion(reportedResult, context);
    await getPythonPackages(reportedResult, context);
    await checkEspIdfTools(reportedResult, context);
    await checkEspIdfRequirements(reportedResult, context);
    console.log(reportedResult);
    await writeTextReport(reportedResult, context);
  } catch (error) {
    console.log(reportedResult);
    console.log(error);
    Logger.error(JSON.stringify(reportedResult), error);
    reportedResult.latestError = error;
    return reportedResult;
  }
}

async function getPipVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.pipVersion = {
    output: undefined,
    result: undefined,
  };
  const rawPipVersion = await execChildProcess(
    `${reportedResult.configurationSettings.pythonBinPath} -m pip --version`,
    context.extensionPath
  );
  reportedResult.pipVersion.output = rawPipVersion;
  const match = rawPipVersion.match(PIP_VERSION_REGEX);
  if (match && match.length) {
    reportedResult.pipVersion.result = match[0].replace(/pip\s/, "");
  }
}

async function getPythonPackages(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.pythonPackages = {
    output: undefined,
    result: undefined,
  };
  const rawPythonPackagesList = await execChildProcess(
    `${reportedResult.configurationSettings.pythonBinPath} -m pip list --format json`,
    context.extensionPath
  );
  reportedResult.pythonPackages.output = rawPythonPackagesList;
  reportedResult.pythonPackages.result = rawPythonPackagesList;
  const parsedPkgsListMatches = rawPythonPackagesList.match(/\[.*\]/g);
  if (parsedPkgsListMatches && parsedPkgsListMatches.length) {
    reportedResult.configurationSettings.pythonPackages = JSON.parse(
      parsedPkgsListMatches[0]
    );
  }
}

async function getPythonVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.pythonVersion = {
    output: undefined,
    result: undefined,
  };
  const rawPythonVersion = await execChildProcess(
    `${reportedResult.configurationSettings.pythonBinPath} --version`,
    context.extensionPath
  );
  reportedResult.pythonVersion.output = rawPythonVersion;
  const match = rawPythonVersion.match(PYTHON_VERSION_REGEX);
  if (match && match.length) {
    reportedResult.pythonVersion.result = match[0].replace(/Python\s/g, "");
  } else {
    reportedResult.pythonVersion.result = "Not found";
  }
}

async function getEspIdfVersion(reportedResult: reportObj) {
  reportedResult.espIdfVersion = {
    output: undefined,
    result: undefined,
  };

  const rawEspIdfVersion = await execChildProcess(
    "git describe --tags",
    reportedResult.configurationSettings.espIdfPath
  );
  reportedResult.espIdfVersion.output = rawEspIdfVersion;
  const espIdfVersionMatch = rawEspIdfVersion.match(ESP_IDF_VERSION_REGEX);
  if (espIdfVersionMatch && espIdfVersionMatch.length) {
    let espVersion: string = "";
    for (let i = 1; i < espIdfVersionMatch.length; i++) {
      if (espIdfVersionMatch[i]) {
        espVersion = `${espVersion}.${espIdfVersionMatch[i]}`;
      }
    }
    reportedResult.espIdfVersion.result = espVersion.substr(1);
  } else {
    reportedResult.espIdfVersion.result = "Not found";
  }
}

async function getGitVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.gitVersion = {
    output: undefined,
    result: undefined,
  };
  const rawGitVersion = await execChildProcess(
    "git --version",
    context.extensionPath
  );
  reportedResult.gitVersion.output = rawGitVersion;
  const versionMatches = rawGitVersion.match(GIT_VERSION_REGEX);
  if (versionMatches && versionMatches.length) {
    reportedResult.gitVersion.result = versionMatches[0].replace(
      /git\sversion\s/g,
      ""
    );
  } else {
    reportedResult.gitVersion.result = "Not found";
  }
}

function getConfigurationSettings(reportedResult: reportObj) {
  const winFlag = process.platform === "win32" ? "Win" : "";
  const configurationSettings: string[] = [
    "idf.espIdfPath" + winFlag,
    "idf.customExtraPaths",
    "idf.customExtraVars",
    "idf.pythonBinPath" + winFlag,
    "idf.port" + winFlag,
    "idf.openOcdConfigs",
    "idf.toolsPath" + winFlag,
  ];
  const settingsValues = {};
  for (const conf of configurationSettings) {
    const confValue = vscode.workspace.getConfiguration("").get(conf);
    settingsValues[conf] = confValue;
  }
  reportedResult.configurationSettings = {
    espIdfPath: vscode.workspace
      .getConfiguration("")
      .get("idf.espIdfPath" + winFlag),
    customExtraPaths: vscode.workspace
      .getConfiguration("")
      .get("idf.customExtraPaths"),
    customExtraVars: vscode.workspace
      .getConfiguration("")
      .get("idf.customExtraVars"),
    pythonBinPath: vscode.workspace
      .getConfiguration("")
      .get("idf.pythonBinPath" + winFlag),
    pythonPackages: [],
    serialPort: vscode.workspace.getConfiguration("").get("idf.port"),
    openOcdConfigs:
      vscode.workspace.getConfiguration("").get("idf.openOcdConfigs") || [],
    toolsPath: vscode.workspace
      .getConfiguration("")
      .get("idf.toolsPath" + winFlag),
    systemEnvPath:
      process.platform === "win32" ? process.env.Path : process.env.PATH,
  };
}

async function getConfigurationAccess(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.configurationAccess = {
    espIdfPath: undefined,
    espIdfToolsPaths: undefined,
    pythonBinPath: undefined,
    cmakeInEnv: undefined,
    ninjaInEnv: undefined,
    toolsPath: undefined,
  };
  reportedResult.configurationAccess.toolsPath = canAccessFile(
    reportedResult.configurationSettings.toolsPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.espIdfPath = canAccessFile(
    reportedResult.configurationSettings.espIdfPath,
    constants.R_OK
  );
  reportedResult.configurationAccess.pythonBinPath = canAccessFile(
    reportedResult.configurationSettings.pythonBinPath,
    constants.X_OK
  );
  const toolPathsArray = reportedResult.configurationSettings.customExtraPaths.split(
    delimiter
  );
  reportedResult.configurationAccess.espIdfToolsPaths = {};
  for (const tool of toolPathsArray) {
    reportedResult.configurationAccess.espIdfToolsPaths[tool] = canAccessFile(
      tool,
      constants.R_OK
    );
  }
  if (process.platform !== "win32") {
    const cmakePathInEnv = await execChildProcess(
      `which cmake`,
      context.extensionPath
    );
    reportedResult.configurationAccess.cmakeInEnv =
      cmakePathInEnv && cmakePathInEnv.indexOf("not found") === -1;
    const ninjaPathInEnv = await execChildProcess(
      `which ninja`,
      context.extensionPath
    );
    reportedResult.configurationAccess.ninjaInEnv =
      ninjaPathInEnv && ninjaPathInEnv.indexOf("not found") === -1;
  }
}

async function checkEspIdfTools(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  const platformInfo = await PlatformInformation.GetPlatformInformation();
  let toolsJsonPath: string = join(
    reportedResult.configurationSettings.espIdfPath,
    "tools",
    "tools.json"
  );
  const jsonExists = await pathExists(toolsJsonPath);
  if (!jsonExists) {
    const idfToolsJsonToUse =
      reportedResult.espIdfVersion.result.localeCompare("4.0") < 0
        ? "fallback-tools.json"
        : "tools.json";
    toolsJsonPath = join(context.extensionPath, idfToolsJsonToUse);
  }
  const toolsJson = await readJSON(toolsJsonPath);
  const idfToolsManager = new IdfToolsManager(
    toolsJson,
    platformInfo,
    OutputChannel.init()
  );
  const verifiedPkgs = await idfToolsManager.checkToolsVersion(
    reportedResult.configurationSettings.customExtraPaths
  );
  reportedResult.espIdfToolsVersions = verifiedPkgs;
}

async function checkEspIdfRequirements(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.idfCheckRequirements = {
    output: undefined,
    result: undefined,
  };
  const requirementsPath = join(
    reportedResult.configurationSettings.espIdfPath,
    "requirements.txt"
  );
  const checkPythonDepsScript = join(
    reportedResult.configurationSettings.espIdfPath,
    "tools",
    "check_python_dependencies.py"
  );
  const modifiedEnv: { [key: string]: string } = <{ [key: string]: string }>(
    Object.assign({}, process.env)
  );
  modifiedEnv.IDF_PATH = reportedResult.configurationSettings.espIdfPath;
  const requirementsResult = await execChildProcess(
    `${reportedResult.configurationSettings.pythonBinPath} ${checkPythonDepsScript} -r "${requirementsPath}"`,
    context.extensionPath,
    { env: modifiedEnv, cwd: context.extensionPath }
  );
  reportedResult.idfCheckRequirements.output = requirementsResult.trim();
  reportedResult.idfCheckRequirements.result = requirementsResult.trim();
}

async function writeTextReport(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  let output = `--------------------------------------------- ESP-IDF Extension for Visual Studio Code report ---------------------------------------------${EOL}`;
  const lineBreak = `-------------------------------------------------------------------------------------------------------------------------------------------${EOL}`;

  output += lineBreak;

  const platformInfo = await PlatformInformation.GetPlatformInformation();
  output += `Platform ${platformInfo.platform} Architecture ${platformInfo.architecture} ${EOL}`;
  output += `System environment variable PATH ${EOL}`;

  output += `--------------------------------------------- Extension configuration settings ----------------------------------------------${EOL}`;
  output += `ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationSettings.espIdfPath}${EOL}`;
  output += `Custom extra paths (idf.customExtraPaths) ${reportedResult.configurationSettings.customExtraPaths}${EOL}`;
  output += `Custom extra vars (idf.customExtraVars) ${reportedResult.configurationSettings.customExtraVars}${EOL}`;
  output += `Virtual env Python Path (idf.pythonBinPath) ${reportedResult.configurationSettings.pythonBinPath}${EOL}`;
  output += `Serial port (idf.port) ${reportedResult.configurationSettings.serialPort}${EOL}`;
  output += `OpenOCD Configs (idf.openOcdConfigs) ${reportedResult.configurationSettings.openOcdConfigs}${EOL}`;
  output += `ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationSettings.toolsPath}${EOL}`;
  output += lineBreak;
  output += `---------------------------------------------- Configurations access --------------------------------------------------------${EOL}`;
  output += `Access to ESP-IDF Path (idf.espIdfPath) ${reportedResult.configurationAccess.espIdfPath}${EOL}`;
  output += `Access to ESP-IDF Custom extra paths${EOL}`;
  for (let key in reportedResult.configurationAccess.espIdfToolsPaths) {
    output += `Access to ${key}: ${reportedResult.configurationAccess.espIdfToolsPaths[key]}${EOL}`;
  }
  output += `Access to Virtual env Python Path (idf.pythonBinPath) ${reportedResult.configurationAccess.pythonBinPath}${EOL}`;
  output += `Access to CMake in environment PATH ${reportedResult.configurationAccess.cmakeInEnv}${EOL}`;
  output += `Access to Ninja in environment PATH ${reportedResult.configurationAccess.ninjaInEnv}${EOL}`;
  output += `Access to ESP-IDF Tools Path (idf.toolsPath) ${reportedResult.configurationAccess.toolsPath}${EOL}`;
  output += `---------------------------------------------- Executables Versions -=-------------------------------------------------------${EOL}`;
  output += `Git version ${
    reportedResult.gitVersion.result
      ? reportedResult.gitVersion.result
      : reportedResult.gitVersion.output
  }${EOL}`;
  output += `ESP-IDF version ${
    reportedResult.espIdfVersion.result
      ? reportedResult.espIdfVersion.result
      : reportedResult.espIdfVersion.output
  }${EOL}`;
  output += `Python version ${
    reportedResult.espIdfVersion.result
      ? reportedResult.espIdfVersion.result
      : reportedResult.espIdfVersion.output
  }${EOL}`;
  output += `Python's pip version ${
    reportedResult.espIdfVersion.result
      ? reportedResult.espIdfVersion.result
      : reportedResult.espIdfVersion.output
  }${EOL}`;
  output += `---------------------------------------------- Python packages in idf.pythonBinPath------------------------------------------${EOL}`;
  output += `Python packages ${
    reportedResult.pythonPackages.result
      ? reportedResult.pythonPackages.result
      : reportedResult.pythonPackages.output
  }${EOL}`;
  for (let pkg of reportedResult.configurationSettings.pythonPackages) {
    output += `${pkg.name} version: ${pkg.version}${EOL}`;
  }
  output += `---------------------------------------------- Check ESP-IDF python requirements.txt ----------------------------------------${EOL}`;
  output += `Python packages ${
    reportedResult.idfCheckRequirements.result
      ? reportedResult.idfCheckRequirements.result
      : reportedResult.idfCheckRequirements.output
  }${EOL}`;
  if (reportedResult.latestError) {
    output += `---------------------------------------------- Latest error -----------------------------------------------------------------${EOL}`;
    output += `Python packages ${
      reportedResult.latestError.message
        ? reportedResult.latestError.message
        : "Unknown error in ESP-IDF doctor command"
    }${EOL}`;
  }
  output += lineBreak;
  const resultFile = join(context.extensionPath, "report.txt");
  await writeFile(resultFile, output);
}
