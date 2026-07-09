/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:07:59 pm
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
import { pathExists, readFile, writeFile, writeJson } from "fs-extra";
import { EOL } from "os";
import { join } from "path";
import * as vscode from "vscode";
import { ESP } from "../config";
import { compareVersion } from "../utils";
import {
  analyzeReport,
  formatConfigCheckLine,
  formatFindingLine,
  formatStatusTag,
  getConfigurationCheckLines,
  isBuildToolAvailable,
} from "./reportAnalysis";
import { reportObj } from "./types";

const LOG_TAIL_LINES = 200;

export async function writeTextReport(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
) {
  reportedResult = replaceUserPath(reportedResult);
  reportedResult.reportSummary = analyzeReport(reportedResult);
  const summary = reportedResult.reportSummary;

  let output = `---------------------------------------------- ESP-IDF Extension for Visual Studio Code report ---------------------------------------------${EOL}`;
  const lineBreak = `--------------------------------------------------------------------------------------------------------------------------------------------${EOL}`;
  output += `OS ${reportedResult.systemInfo.platform} ${reportedResult.systemInfo.architecture} ${reportedResult.systemInfo.systemName} ${EOL}`;
  output += `System environment variable IDF_PYTHON_ENV_PATH ${EOL} ${reportedResult.systemInfo.envIdfPythonEnvPath} ${EOL}`;
  output += `System environment variable PATH ${EOL} ${reportedResult.systemInfo.envPath} ${EOL}`;
  output += `System environment variable PYTHON ${EOL} ${reportedResult.systemInfo.envPython} ${EOL}`;
  output += `Visual Studio Code Remote name ${reportedResult.systemInfo.remoteName} ${EOL}`;
  output += `Visual Studio Code version ${reportedResult.systemInfo.vscodeVersion} ${EOL}`;
  output += `Visual Studio Code language ${reportedResult.systemInfo.language} ${EOL}`;
  output += `Visual Studio Code shell ${reportedResult.systemInfo.shell} ${EOL}`;
  output += `Visual Studio Code app name ${reportedResult.systemInfo.appName} ${EOL}`;
  output += `ESP-IDF Extension version ${reportedResult.systemInfo.extensionVersion} ${EOL}`;
  output += `Workspace folder ${reportedResult.workspaceFolder} ${EOL}`;

  output += `======================================== CONFIGURATION SUMMARY ========================================${EOL}`;
  output += `Overall status: ${summary.overall} (${summary.errorCount} error${summary.errorCount === 1 ? "" : "s"}, ${summary.warningCount} warning${summary.warningCount === 1 ? "" : "s"})${EOL}${EOL}`;
  for (const finding of summary.findings) {
    if (finding.status === "ok" || finding.status === "fail" || finding.status === "warn") {
      output += `${formatFindingLine(finding)}${EOL}`;
    }
  }
  output += `======================================================================================================${EOL}`;

  output += `-------------------------------------------------------- Configuration checks -------------------------------------------------------------${EOL}`;
  for (const line of getConfigurationCheckLines(reportedResult)) {
    output += `${formatConfigCheckLine(line)}${EOL}`;
  }

  output += `---------------------------------------------------- Additional extension settings ------------------------------------------------------${EOL}`;
  output += `Custom extra paths ${reportedResult.configurationSettings.customExtraPaths}${EOL}`;
  if (
    reportedResult.configurationSettings.idfExtraVars &&
    Object.keys(reportedResult.configurationSettings.idfExtraVars).length
  ) {
    output += `ESP-IDF Project Setup Variables${EOL}`;
    for (const key in reportedResult.configurationSettings.idfExtraVars) {
      output += `    ${key}: ${reportedResult.configurationSettings.idfExtraVars[key]}${EOL}`;
    }
  }
  if (
    reportedResult.configurationSettings.userExtraVars &&
    Object.keys(reportedResult.configurationSettings.userExtraVars).length
  ) {
    output += `User extra vars (idf.customExtraVars)${EOL}`;
    for (const key in reportedResult.configurationSettings.userExtraVars) {
      output += `    ${key}: ${reportedResult.configurationSettings.userExtraVars[key]}${EOL}`;
    }
  }
  output += `Serial port (idf.port) ${reportedResult.configurationSettings.serialPort}${EOL}`;
  output += `OpenOCD Configs (idf.openOcdConfigs) ${reportedResult.configurationSettings.openOcdConfigs}${EOL}`;
  output += `OpenOCD log level (idf.openOcdDebugLevel) ${reportedResult.configurationSettings.openOCDDebugLevel}${EOL}`;
  output += `OpenOCD launch arguments (idf.openOcdLaunchArgs) ${reportedResult.configurationSettings.openOcdLaunchArgs}${EOL}`;
  output += `Git Path (ESP-IDF Project Setup Variables PATH) ${reportedResult.configurationSettings.gitPath}${EOL}`;
  output += `Notification Mode (idf.notificationMode) ${reportedResult.configurationSettings.notificationMode}${EOL}`;
  output += `Flash type (idf.flashType) ${reportedResult.configurationSettings.flashType}${EOL}`;
  output += `Flash partition to use (idf.flashPartitionToUse) ${reportedResult.configurationSettings.flashPartitionToUse}${EOL}`;
  if (reportedResult.configurationSettings.customTerminalExecutable) {
    output += `Custom terminal executable (idf.customTerminalExecutable) ${reportedResult.configurationSettings.customTerminalExecutable}${EOL}`;
  }
  if (
    reportedResult.configurationSettings.customTerminalExecutableArgs &&
    reportedResult.configurationSettings.customTerminalExecutableArgs.length
  ) {
    output += `Custom terminal executable args (idf.customTerminalExecutableArgs)${reportedResult.configurationSettings.customTerminalExecutableArgs}${EOL}`;
  }

  output += `----------------------------------------------------------- Executables Versions -----------------------------------------------------------${EOL}`;
  output += `ESP-IDF version ${
    reportedResult.espIdfVersion.result
      ? reportedResult.espIdfVersion.result
      : reportedResult.espIdfVersion.output
  }${EOL}`;
  output += `Python version ${
    reportedResult.pythonVersion.result
      ? reportedResult.pythonVersion.result
      : reportedResult.pythonVersion.output
  }${EOL}`;
  output += `Python's pip version ${
    reportedResult.pipVersion.result
      ? reportedResult.pipVersion.result
      : reportedResult.pipVersion.output
  }${EOL}`;

  if (reportedResult.espIdfToolsVersions.length) {
    output += `----------------------------------------------------------- ESP-IDF Tools ----------------------------------------------------------------${EOL}`;
    const cmake = isBuildToolAvailable(
      "cmake",
      reportedResult.configurationAccess.cmakeInEnv,
      reportedResult.espIdfToolsVersions
    );
    const ninja = isBuildToolAvailable(
      "ninja",
      reportedResult.configurationAccess.ninjaInEnv,
      reportedResult.espIdfToolsVersions
    );
    output += `CMake   ${formatStatusTag(cmake.available ? "ok" : "fail")}   ${cmake.source === "env" ? "system PATH" : cmake.source === "idf-tools" ? `ESP-IDF tools (actual: ${cmake.actual || "unknown"})` : "not found"}${EOL}`;
    output += `Ninja   ${formatStatusTag(ninja.available ? "ok" : "fail")}   ${ninja.source === "env" ? "system PATH" : ninja.source === "idf-tools" ? `ESP-IDF tools (actual: ${ninja.actual || "unknown"})` : "not found"}${EOL}`;
    for (const tool of reportedResult.espIdfToolsVersions) {
      if (tool.name === "cmake" || tool.name === "ninja") {
        continue;
      }
      const status = tool.doesToolExist ? "ok" : "fail";
      output += `Tool: ${tool.name}   expected: ${tool.expected}   actual: ${tool.actual || "(missing)"}   ${formatStatusTag(status)}${EOL}`;
    }
  }

  output += `-------------------------------------------------- Project configuration settings ----------------------------------------------------------${EOL}`;
  if (reportedResult.selectedProjectConfiguration) {
    const idfVersion = reportedResult.espIdfVersion.result;
    const supportsIdfPreset =
      idfVersion &&
      idfVersion !== "x.x" &&
      compareVersion(idfVersion, "6.0") !== -1;
    output += `Selected configuration: ${reportedResult.selectedProjectConfiguration}${EOL}`;
    output += supportsIdfPreset
      ? `IDF_PRESET (passed to idf.py as the active CMake preset) ${reportedResult.selectedProjectConfiguration}${EOL}${EOL}`
      : `IDF_PRESET not exported: idf.py --preset requires ESP-IDF v6.0 or higher. The extension applies the configuration to its own commands instead.${EOL}${EOL}`;
  }
  if (reportedResult.projectConfigurations) {
    for (let key of Object.keys(reportedResult.projectConfigurations)) {
      const preset = reportedResult.projectConfigurations[key];
      output += `Configuration preset: ${key}${EOL}`;
      if (!preset) {
        continue;
      }
      output += `     Build directory (binaryDir): ${preset.binaryDir}${EOL}`;

      if (preset.cacheVariables) {
        output += `---- Cache variables section ----${EOL}`;
        for (const cacheKey of Object.keys(preset.cacheVariables)) {
          output += `     ${cacheKey}: ${preset.cacheVariables[cacheKey]}${EOL}`;
        }
      }

      if (preset.environment) {
        output += `---- Environment variables section ----${EOL}`;
        for (const envKey of Object.keys(preset.environment)) {
          output += `     ${envKey}: ${preset.environment[envKey]}${EOL}`;
        }
      }

      const espIdfSettings =
        preset.vendor?.[ESP.CMakePresets.ESP_IDF_VENDOR_KEY]?.settings || [];
      if (espIdfSettings.length) {
        output += `---- ESP-IDF vendor settings section ----${EOL}`;
        for (const setting of espIdfSettings) {
          output += `     ${setting.type}: ${JSON.stringify(
            setting.value
          )}${EOL}`;
        }
      }
    }
  }
  output += `-------------------------------------------------- Python packages in Virtual environment Python path (computed) ---------------------------${EOL}`;
  if (reportedResult.configurationSettings.pythonPackages) {
    for (const pkg of reportedResult.configurationSettings.pythonPackages) {
      output += `${pkg.name} version: ${pkg.version}${EOL}`;
    }
  } else {
    output += `Python packages ${
      reportedResult.pythonPackages.result
        ? reportedResult.pythonPackages.result
        : reportedResult.pythonPackages.output
    }${EOL}`;
  }
  output += `---------------------------------------------------- Check ESP-IDF python requirements.txt -------------------------------------------------${EOL}`;
  const requirementsResult =
    reportedResult.idfCheckRequirements.result ||
    reportedResult.idfCheckRequirements.output;
  const requirementsStatus = requirementsResult.startsWith("Error:")
    ? "fail"
    : "ok";
  output += `${formatStatusTag(requirementsStatus)} Check ESP-IDF Python packages ${requirementsResult}${EOL}`;
  if (reportedResult.espIdfSetups) {
    output += `---------------------------------------------------- ESP-IDF Setups ------------------------------------------------------------------------${EOL}`;
    for (const idfSetup of reportedResult.espIdfSetups) {
      output += `ESP-IDF setup IDF PATH: ${idfSetup.idfPath}${EOL}`;
      output += `------- git path: ${idfSetup.gitPath}${EOL}`;
      output += `------- IDF_TOOLS_PATH: ${idfSetup.toolsPath}${EOL}`;
      output += `------- version: ${idfSetup.version}${EOL}`;
      output += `------- python path: ${idfSetup.python}${EOL}`;
      if (idfSetup.sysPythonPath) {
        output += `------- system python path: ${idfSetup.sysPythonPath}${EOL}`;
      }
      if (idfSetup.activationScript) {
        output += `------- activation script path: ${idfSetup.activationScript}${EOL}`;
      }
      output += `------- is valid? ${idfSetup.isValid}${EOL}`;
      if (idfSetup.reason) {
        output += `------- reason: ${idfSetup.reason}${EOL}`;
      }
      output += `--------------------------------------------------------${EOL}`;
    }
  }
  if (reportedResult.launchJson) {
    output += `---------------------------------------------------- Visual Studio Code launch.json --------------------------------------------------------${EOL}`;
    output += `${reportedResult.launchJson} ${EOL}`;
  }
  if (reportedResult.cCppPropertiesJson) {
    output += `---------------------------------------------------- Visual Studio Code c_cpp_properties.json ----------------------------------------------${EOL}`;
    output += `${reportedResult.cCppPropertiesJson} ${EOL}`;
  }
  if (reportedResult.latestError?.message) {
    output += `----------------------------------------------------------- Latest error -----------------------------------------------------------------${EOL}`;
    output += JSON.stringify(reportedResult.latestError, undefined, 2) + EOL;
  }
  output += lineBreak;
  const logFile = join(context.extensionPath, "esp_idf_vsc_ext.log");
  const logFileExists = await pathExists(logFile);
  if (logFileExists) {
    const logFileContent = await readFile(logFile, "utf8");
    const logLines = logFileContent.split(/\r?\n/);
    const truncatedLog =
      logLines.length > LOG_TAIL_LINES
        ? logLines.slice(-LOG_TAIL_LINES).join(EOL)
        : logFileContent;
    output += `----------------------------------------------------------- Logfile (last ${LOG_TAIL_LINES} lines) -----------------------------------------------------------------${EOL}`;
    if (logLines.length > LOG_TAIL_LINES) {
      output += `(Truncated. See esp_idf_vsc_ext.log for the full log.)${EOL}`;
    }
    output += replaceUserPathInStr(truncatedLog) + EOL + lineBreak;
  }
  const resultFile = join(context.extensionPath, "report.txt");
  await writeFile(resultFile, output);
  const resultJson = join(context.extensionPath, "report.json");
  await writeJson(resultJson, reportedResult, {
    spaces: 2,
  });
  return output;
}

export function replaceUserPath(report: reportObj): reportObj {
  const strReport = JSON.stringify(report);

  // Replacing all home paths (based on OS) with '...' using es6 syntax. Can be replaced with one line using .replaceAll() when we will update the version of ECMAScript to 2021 or higher
  const parsedReport = replaceUserPathInStr(strReport);

  return parsedReport ? JSON.parse(parsedReport) : report;
}

function replaceUserPathInStr(strReport: string) {
  if (process.env.HOMEPATH) {
    const homePath = process.env.HOMEPATH;
    // Escape the path for regex, but keep backslashes as is
    const escapedPath = homePath.replace(/[.*+?^${}()|[\]\\]/g, (match) => {
      return match === "\\" ? "\\\\\\\\" : "\\" + match;
    });
    // Create pattern that matches both Windows and Posix style
    const posixPath = homePath
      .replace(/\\/g, "/")
      .replace(/[.*+?^${}()|[\]\\]/g, (match) => {
        return match === "/" ? "/" : "\\" + match;
      });
    const pattern = `(${escapedPath}|${posixPath})`;
    const re = new RegExp(pattern, "g");
    return strReport.replace(re, "<HOMEPATH>");
  } else if (process.env.HOME) {
    // For non-Windows systems, escape HOME path for regex
    const escapedHome = process.env.HOME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escapedHome, "g");
    return strReport.replace(re, "<HOMEPATH>");
  }
}
