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
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { reportedResult } from "./initReportObj";
import { getConfigurationSettings } from "./configurationSettings";
import { getConfigurationAccess } from "./configurationAccess";
import { getGitVersion } from "./gitVersion";
import { getEspIdfVersion } from "./espIdfVersion";
import { getPythonVersion } from "./pythonVersion";
import { getPipVersion } from "./pipVersion";
import { getPythonPackages } from "./pythonPackages";
import { checkEspIdfTools } from "./checkEspIdfTools";
import { checkEspIdfRequirements } from "./checkEspIdfRequirements";
import {
  checkDebugAdapterRequirements,
  checkExtensionRequirements,
} from "./checkExtensionRequirements";
import { writeTextReport } from "./writeReport";

export async function generateConfigurationReport(
  context: vscode.ExtensionContext
) {
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
    await checkExtensionRequirements(reportedResult, context);
    await checkDebugAdapterRequirements(reportedResult, context);
    const reportOutput = await writeTextReport(reportedResult, context);
    await vscode.env.clipboard.writeText(reportOutput);
    reportedResult.formatedOutput = reportOutput;
    Logger.infoNotify(
      "Extension configuration report has been copied to clipboard"
    );
    return reportedResult;
  } catch (error) {
    reportedResult.latestError = error;
    const errMsg = error.message ? error.message : "Configuration report error";
    Logger.error(errMsg, error);
    Logger.warnNotify(
      "Extension configuration report has been copied to clipboard with errors"
    );
    const reportOutput = await writeTextReport(reportedResult, context);
    await vscode.env.clipboard.writeText(reportOutput);
    return reportedResult;
  }
}
