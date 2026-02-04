/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd December 2020 4:35:32 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { reportObj } from "./types";
import { getConfigurationSettings } from "./configurationSettings";
import { getConfigurationAccess } from "./configurationAccess";
import { getGitVersion } from "./gitVersion";
import { getEspIdfVersion } from "./espIdfVersion";
import { getPythonVersion } from "./pythonVersion";
import { getPipVersion } from "./pipVersion";
import { getPythonPackages } from "./pythonPackages";
import { checkEspIdfTools } from "./checkEspIdfTools";
import { checkEspIdfRequirements } from "./checkEspIdfRequirements";
import { writeTextReport } from "./writeReport";
import { checkSystemInfo } from "./checkSystemInfo";
import { checkCCppPropertiesJson, checkLaunchJson } from "./checkVscodeFiles";
import { checkSpacesInSettings } from "./checkSpacesInSettings";
import {
  getProjectConfigurations,
  getSelectedProjectConfiguration,
} from "./projectConfiguration";
import { checkIDFSetups } from "./checkIdfSetups";

export async function generateConfigurationReport(
  context: vscode.ExtensionContext,
  currentWorkspace: vscode.Uri,
  reportedResult: reportObj,
  progress: vscode.Progress<{ message: string; increment: number }>
) {
  progress.report({
    message: "Generating configuration report...",
    increment: 0,
  });
  await getConfigurationSettings(reportedResult, currentWorkspace);
  progress.report({
    message: "Checking system information...",
    increment: 7,
  });
  await checkSystemInfo(reportedResult);
  progress.report({
    message: "Checking configuration access...",
    increment: 13,
  });
  await getConfigurationAccess(reportedResult);
  progress.report({
    message: "Checking spaces in settings...",
    increment: 20,
  });
  checkSpacesInSettings(reportedResult);
  progress.report({
    message: "Checking git version...",
    increment: 27,
  });
  await getGitVersion(reportedResult, context);
  progress.report({
    message: "Checking ESP-IDF version...",
    increment: 33,
  });
  await getEspIdfVersion(reportedResult);
  progress.report({
    message: "Checking Python version...",
    increment: 40,
  });
  await getPythonVersion(reportedResult, context);
  progress.report({
    message: "Checking pip version...",
    increment: 47,
  });
  await getPipVersion(reportedResult, context);
  progress.report({
    message: "Checking Python packages...",
    increment: 53,
  });
  await getPythonPackages(reportedResult, context);
  progress.report({
    message: "Checking ESP-IDF tools...",
    increment: 60,
  });
  await checkEspIdfTools(reportedResult, context);
  progress.report({
    message: "Checking ESP-IDF requirements...",
    increment: 67,
  });
  await checkEspIdfRequirements(reportedResult, context);
  progress.report({
    message: "Checking Visual Studio Code files...",
    increment: 73,
  });
  await checkLaunchJson(reportedResult, currentWorkspace);
  progress.report({
    message: "Checking C/C++ properties...",
    increment: 80,
  });
  await checkCCppPropertiesJson(reportedResult, currentWorkspace);
  progress.report({
    message: "Checking project configurations...",
    increment: 87,
  });
  getProjectConfigurations(reportedResult);
  progress.report({
    message: "Getting selected project configuration...",
    increment: 93,
  });
  getSelectedProjectConfiguration(reportedResult);
  progress.report({
    message: "Checking ESP-IDF setups...",
    increment: 97,
  });
  await checkIDFSetups(reportedResult, currentWorkspace);
  progress.report({
    message: "Generating report...",
    increment: 100,
  });
  const reportOutput = await writeTextReport(reportedResult, context);
  await vscode.env.clipboard.writeText(reportOutput);
  reportedResult.formatedOutput = reportOutput;
  Logger.infoNotify(
    "Extension configuration report has been copied to clipboard"
  );
  return reportedResult;
}
