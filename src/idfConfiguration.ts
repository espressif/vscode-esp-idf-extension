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

import * as vscode from "vscode";
import { Logger } from "./logger/logger";
import { ESP } from "./config";
import { ProjectConfElement } from "./project-conf/projectConfiguration";
import { SerialPort } from "./espIdf/serial/serialPort";
import { showInfoNotificationWithAction } from "./logger/utils";

export enum NotificationMode {
  Silent = "Silent",
  Notifications = "Notifications",
  Output = "Output",
  All = "All",
}

export function addWinIfRequired(param: string) {
  const winFlag = process.platform === "win32" ? "Win" : "";
  for (const platDepConf of ESP.platformDepConfigurations) {
    if (param.indexOf(platDepConf) >= 0) {
      return param + winFlag;
    }
  }
  return param;
}

export function parameterToProjectConfigMap(
  param: string,
  scope?: vscode.ConfigurationScope
): any {
  if (!ESP.ProjectConfiguration.store) {
    return "";
  }
  const currentProjectConfKey = ESP.ProjectConfiguration.store.get<string>(
    ESP.ProjectConfiguration.SELECTED_CONFIG
  );
  if (!currentProjectConfKey) {
    return "";
  }
  const currentProjectConf = ESP.ProjectConfiguration.store.get<
    ProjectConfElement
  >(currentProjectConfKey);
  if (!currentProjectConf) {
    return "";
  }
  switch (param) {
    case "idf.cmakeCompilerArgs":
      return currentProjectConf.build &&
        currentProjectConf.build.compileArgs &&
        currentProjectConf.build.compileArgs.length
        ? currentProjectConf.build.compileArgs
        : "";
    case "idf.ninjaArgs":
      return currentProjectConf.build &&
        currentProjectConf.build.ninjaArgs &&
        currentProjectConf.build.ninjaArgs.length
        ? currentProjectConf.build.ninjaArgs
        : "";
    case "idf.buildPath":
      return currentProjectConf.build &&
        currentProjectConf.build.buildDirectoryPath
        ? currentProjectConf.build.buildDirectoryPath
        : "";
    case "idf.sdkconfigDefaults":
      return currentProjectConf.build &&
        currentProjectConf.build.sdkconfigDefaults &&
        currentProjectConf.build.sdkconfigDefaults.length
        ? currentProjectConf.build.sdkconfigDefaults
        : "";
    case "idf.customExtraVars":
      const paramUpdated = addWinIfRequired(param);
      let settingsVars = vscode.workspace
        .getConfiguration("", scope)
        .get(paramUpdated) as { [key: string]: any };
      let resultVars = {};
      for (const envKey of Object.keys(settingsVars)) {
        resultVars[envKey] = settingsVars[envKey];
      }
      if (
        currentProjectConf.env &&
        typeof currentProjectConf.env === "object" &&
        !Array.isArray(currentProjectConf.env)
      ) {
        for (const projectConfEnvKey of Object.keys(currentProjectConf.env)) {
          resultVars[projectConfEnvKey] =
            currentProjectConf.env[projectConfEnvKey];
        }
      }
      if (currentProjectConf.idfTarget) {
        resultVars["IDF_TARGET"] = currentProjectConf.idfTarget;
      }
      return resultVars;
    case "idf.flashBaudRate":
      return currentProjectConf.flashBaudRate;
    case "idf.monitorBaudRate":
      return currentProjectConf.monitorBaudRate;
    case "idf.openOcdDebugLevel":
      return currentProjectConf.openOCD && currentProjectConf.openOCD.debugLevel
        ? currentProjectConf.openOCD.debugLevel
        : "";
    case "idf.openOcdConfigs":
      return currentProjectConf.openOCD &&
        currentProjectConf.openOCD.configs &&
        currentProjectConf.openOCD.configs.length
        ? currentProjectConf.openOCD.configs
        : "";
    case "idf.openOcdLaunchArgs":
      return currentProjectConf.openOCD &&
        currentProjectConf.openOCD.args &&
        currentProjectConf.openOCD.args.length
        ? currentProjectConf.openOCD.args
        : "";
    case "idf.preBuildTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.preBuild
        ? currentProjectConf.tasks.preBuild
        : "";
    case "idf.postBuildTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.postBuild
        ? currentProjectConf.tasks.postBuild
        : "";
    case "idf.preFlashTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.preFlash
        ? currentProjectConf.tasks.preFlash
        : "";
    case "idf.postFlashTask":
      return currentProjectConf.tasks && currentProjectConf.tasks.postFlash
        ? currentProjectConf.tasks.postFlash
        : "";
    case "idf.sdkconfigFilePath":
      return currentProjectConf.build &&
        currentProjectConf.build.sdkconfigFilePath
        ? currentProjectConf.build.sdkconfigFilePath
        : "";
    default:
      return "";
  }
}

export function readParameter(
  param: string,
  scope?: vscode.ConfigurationScope
) {
  const paramUpdated = addWinIfRequired(param);
  let paramValue = parameterToProjectConfigMap(param);
  paramValue =
    paramValue ||
    vscode.workspace.getConfiguration("", scope).get(paramUpdated);
  if (typeof paramValue === "undefined") {
    return "";
  }
  if (typeof paramValue === "string") {
    return resolveVariables(paramValue, scope);
  }
  if (typeof paramValue === "object" && Array.isArray(paramValue)) {
    const resultArr = [];
    for (const el of paramValue) {
      if (typeof el === "string") {
        resultArr.push(resolveVariables(el, scope));
      } else {
        resultArr.push(el);
      }
    }
    return resultArr;
  }
  return paramValue;
}

export async function chooseConfigurationTarget() {
  const confTarget = await vscode.window.showQuickPick(
    [
      {
        description: "Global",
        label: "Global",
        target: vscode.ConfigurationTarget.Global,
      },
      {
        description: "Workspace",
        label: "Workspace",
        target: vscode.ConfigurationTarget.Workspace,
      },
      {
        description: "Workspace Folder",
        label: "Workspace Folder",
        target: vscode.ConfigurationTarget.WorkspaceFolder,
      },
    ],
    { placeHolder: "Where to save the configuration?" }
  );
  if (!confTarget) {
    return;
  }
  await writeParameter(
    "idf.saveScope",
    confTarget.target,
    vscode.ConfigurationTarget.Global
  );
  Logger.infoNotify(`Save location has changed to ${confTarget.description}`);
  return confTarget.target;
}

export async function writeParameter(
  param: string,
  newValue,
  target: vscode.ConfigurationTarget,
  wsFolderUri?: vscode.Uri
) {
  const paramValue = addWinIfRequired(param);
  if (target !== vscode.ConfigurationTarget.WorkspaceFolder) {
    await vscode.workspace
      .getConfiguration()
      .update(paramValue, newValue, target);

    vscode.workspace.getConfiguration("");
    return target === vscode.ConfigurationTarget.Global
      ? "User settings"
      : "Workspace settings";
  } else {
    if (
      typeof vscode.workspace.workspaceFolders === "undefined" ||
      !vscode.workspace.workspaceFolders.length
    ) {
      return;
    }
    if (!wsFolderUri) {
      let workspaceFolder = await vscode.window.showWorkspaceFolderPick({
        placeHolder: `Pick Workspace Folder to which ${param} should be applied`,
      });
      wsFolderUri = workspaceFolder.uri;
    }
    await vscode.workspace
      .getConfiguration("", wsFolderUri)
      .update(paramValue, newValue, target);

    vscode.workspace.getConfiguration("");
    return wsFolderUri.fsPath;
  }
}

export async function updateConfParameter(
  confParamName: string,
  confParamDescription: string,
  currentValue: any,
  label: string,
  workspaceFolderUri: vscode.Uri
) {
  const newValue = await vscode.window.showInputBox({
    placeHolder: confParamDescription,
    value: currentValue,
  });
  if (typeof newValue === "undefined") {
    return;
  }
  if (newValue.indexOf("~") !== -1) {
    const msg =
      "Character ~ is not valid for ESP-IDF extension configuration settings.";
    Logger.warnNotify(msg);
    throw new Error(msg);
  }
  const typeOfConfig = checkTypeOfConfiguration(confParamName);
  let valueToWrite: any;
  if (typeOfConfig === "array") {
    valueToWrite = parseStrToArray(newValue);
  } else {
    valueToWrite = newValue;
  }
  await writeParameter(
    confParamName,
    valueToWrite,
    vscode.ConfigurationTarget.WorkspaceFolder,
    workspaceFolderUri
  );
  const updateMessage = vscode.l10n.t(" has been updated");
  Logger.infoNotify(label + updateMessage);
}

export function checkTypeOfConfiguration(paramName: string) {
  const { defaultValue } = vscode.workspace
    .getConfiguration()
    .inspect(paramName);
  if (typeof defaultValue === "object") {
    return Array.isArray(defaultValue) ? "array" : "object";
  } else {
    return typeof defaultValue;
  }
}

export function parseStrToArray(groupStr: string) {
  const initialArray = groupStr.split(",");
  const resultArr = [];
  for (const el of initialArray) {
    if (el.trim() !== "") {
      resultArr.push(el.trim());
    }
  }
  return resultArr;
}

export function resolveVariables(
  configPath: string,
  scope?: vscode.ConfigurationScope
) {
  const regexp = /\$\{(.*?)\}/g; // Find ${anything}
  return configPath.replace(regexp, (match: string, name: string) => {
    if (match.indexOf("config:") > 0) {
      const configVar = name.substring(
        name.indexOf("config:") + "config:".length
      );

      const delimiterIndex = configVar.indexOf(",");
      let configVarName = configVar;
      let prefix = "";

      // Check if a delimiter (e.g., ",") is present
      if (delimiterIndex > -1) {
        configVarName = configVar.substring(0, delimiterIndex);
        prefix = configVar.substring(delimiterIndex + 1).trim();
      }
      const configVarValue = readParameter(configVarName, scope);

      if (prefix && Array.isArray(configVarValue)) {
        return configVarValue.map((value) => `${prefix}${value}`).join(" ");
      }

      if (prefix && typeof configVarValue === "string") {
        return `${prefix} ${configVarValue}`;
      }

      return configVarValue;
    }
    if (match.indexOf("env:") > 0) {
      const envVariable = name.substring(name.indexOf("env:") + "env:".length);
      const customExtraVars = readParameter("idf.customExtraVars", scope);
      if (Object.keys(customExtraVars).indexOf(envVariable) !== -1) {
        return customExtraVars[envVariable];
      }
      if (Object.keys(process.env).indexOf(envVariable) === -1) {
        return "";
      }
      return process.env[envVariable];
    }
    if (scope && match.indexOf("workspaceFolder") > 0) {
      return scope instanceof vscode.Uri ? scope.fsPath : scope.uri.fsPath;
    }
    if (match.indexOf("execPath") > 0) {
      return process.execPath;
    }
    return match;
  });
}

/**
 * Read serial port configuration and handle "detect" mode
 * @param workspaceFolder The workspace folder URI
 * @param useMonitorPort Whether to use monitor port setting instead of flash port
 * @returns The resolved port string or undefined if detection fails
 */
export async function readSerialPort(
  workspaceFolder: vscode.Uri,
  useMonitorPort: boolean = false
): Promise<string> {
  const portSetting = useMonitorPort ? "idf.monitorPort" : "idf.port";
  const port = readParameter(portSetting, workspaceFolder) as string;

  if (port === "detect") {
    Logger.info("Port set to 'detect', running auto-detection...");
    const detectedPort = await SerialPort.detectDefaultPort(workspaceFolder);
    if (detectedPort) {
      Logger.info(`Auto-detected port: ${detectedPort}`);
      await SerialPort.shared().updatePortListStatus(
        detectedPort,
        workspaceFolder,
        useMonitorPort
      );
      return detectedPort;
    } else {
      Logger.warn("Auto-detection failed, no compatible device found");
      await showInfoNotificationWithAction(
        vscode.l10n.t(
          "Serial port auto-detection failed, no compatible device found"
        ),
        vscode.l10n.t("Detect"),
        () => vscode.commands.executeCommand("espIdf.detectSerialPort")
      );
      return "";
    }
  }

  return port;
}
