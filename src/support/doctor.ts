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
import { EOL } from "os";
import * as vscode from "vscode";

const GIT_VERSION_REGEX = /(?:git\sversion\s)(\d+)(.\d+)?(.\d+)?(?:.windows.\d+)?/g;

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
        return resolve("".concat(stdout, stderr));
      }
      return resolve(stdout);
    });
  });
}

export interface Configuration {
  espIdfPath: string;
  customExtraPaths: string;
  customExtraVars: string;
  pythonBinPath: string;
  pythonPackages: string[];
  serialPort: string;
  openOcdConfigs: string[];
  toolPath: string;
}

export interface execResult {
  error: Error;
  output: string;
  result: string;
}

export interface reportObj {
  configurationSettings: Configuration;
  gitVersion: execResult;
  espIdfVersion: execResult;
  pythonVersion: execResult;
  pythonPackages: execResult;
}

export async function generateConfigurationReport(
  context: vscode.ExtensionContext
) {
  const reportedResult: reportObj = {} as reportObj;
  getConfigurationSettings(reportedResult);

  await getGitVersion(reportedResult, context);
  await getEspIdfVersion(reportedResult);
  await getPythonVersion(reportedResult, context);
  console.log(reportedResult);
  reportedResult.pythonPackages = {
    error: undefined,
    output: undefined,
    result: undefined,
  };
  try {
    const rawPythonPackagesList = await execChildProcess(
      `${reportedResult.configurationSettings.pythonBinPath} -m pip list`,
      context.extensionPath
    );
    reportedResult.pythonPackages.output = rawPythonPackagesList;
    reportedResult.pythonPackages.result = rawPythonPackagesList;
    reportedResult.configurationSettings.pythonPackages = rawPythonPackagesList.split(
      EOL
    );
  } catch (error) {
    reportedResult.pythonPackages.result = "ERROR";
    reportedResult.pythonPackages.error = error;
  }
  console.log(reportedResult);
}

async function getPythonVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.pythonVersion = {
    error: undefined,
    output: undefined,
    result: undefined,
  };
  try {
    const rawPythonVersion = await execChildProcess(
      `${reportedResult.configurationSettings.pythonBinPath} --version`,
      context.extensionPath
    );
    reportedResult.pythonVersion.output = rawPythonVersion;
    const match = rawPythonVersion.match(/Python\s\d+(.\d+)?(.\d+)?/g);
    if (match && match.length) {
      reportedResult.pythonVersion.result = match[0].replace(/Python\s/g, "");
    } else {
      reportedResult.pythonVersion.result = "Not found";
    }
  } catch (error) {
    reportedResult.pythonVersion.result = "ERROR";
    reportedResult.pythonVersion.error = error;
  }
}

async function getEspIdfVersion(reportedResult: reportObj) {
  reportedResult.espIdfVersion = {
    error: undefined,
    output: undefined,
    result: undefined,
  };

  try {
    const rawEspIdfVersion = await execChildProcess(
      "git describe --tags",
      reportedResult.configurationSettings.espIdfPath
    );
    reportedResult.espIdfVersion.output = rawEspIdfVersion;
    const espIdfVersionMatch = rawEspIdfVersion.match(
      /^v(\d+)(?:\.)?(\d+)?(?:\.)?(\d+)?.*/
    );
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
      reportedResult.pythonVersion.error = new Error(rawEspIdfVersion);
    }
  } catch (error) {
    reportedResult.espIdfVersion.result = "ERROR";
    reportedResult.espIdfVersion.error = error;
  }
}

async function getGitVersion(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult.gitVersion = {
    error: undefined,
    output: undefined,
    result: undefined,
  };
  try {
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
  } catch (error) {
    reportedResult.gitVersion.result = "ERROR";
    reportedResult.gitVersion.error = error;
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
    toolPath: vscode.workspace
      .getConfiguration("")
      .get("idf.toolsPath" + winFlag),
  };
}
