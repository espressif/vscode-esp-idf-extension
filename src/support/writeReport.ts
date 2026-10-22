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
  formatLogErrorDate,
  formatStatusTag,
  getConfigurationCheckLines,
  isBuildToolAvailable,
  summarizeLogTail,
} from "./reportAnalysis";
import {
  DiagnosticFinding,
  reportObj,
  ReportSummary,
  SetupReportStatus,
} from "./types";

const LOG_TAIL_LINES = 200;
const BUILD_TOOL_NAMES = new Set(["cmake", "ninja"]);

export const DOCTOR_SUMMARY_FILE = "report.txt";
export const DOCTOR_REPAIR_INSTRUCTION =
  "Run ESP-IDF: Open ESP-IDF Installation Manager to repair the active setup.";

interface LogTail {
  found: boolean;
  text: string;
  truncated: boolean;
}

export async function writeTextReport(
  reportedResult: reportObj,
  context: vscode.ExtensionContext
): Promise<string> {
  // Error.message is not enumerable, so JSON redaction would drop it.
  const latestErrorMessage = reportedResult.latestError?.message
    ? replaceUserPathInStr(reportedResult.latestError.message)
    : "";
  // Keep mutations on the caller's object (replaceUserPath returns a clone).
  Object.assign(reportedResult, replaceUserPath(reportedResult));
  if (latestErrorMessage) {
    reportedResult.latestError = new Error(latestErrorMessage);
  }
  reportedResult.reportSummary = analyzeReport(reportedResult);
  const logTail = await readLogTail(context);
  const reportText =
    formatSummaryReport(reportedResult, logTail.text) +
    formatDetailsReport(reportedResult, logTail);
  reportedResult.formatedOutput = reportText;
  await writeFile(join(context.extensionPath, DOCTOR_SUMMARY_FILE), reportText);
  await writeJson(join(context.extensionPath, "report.json"), reportedResult, {
    spaces: 2,
  });
  return reportText;
}

export function formatSummaryReport(report: reportObj, logText = ""): string {
  const summary = report.reportSummary ?? analyzeReport(report);
  const settings = report.configurationSettings;
  const info = report.systemInfo;
  const version =
    report.espIdfVersion.result || report.espIdfVersion.output || "(unknown)";
  const idfPath = settings.espIdfPath || "(not set)";

  let output = `ESP-IDF Doctor${EOL}`;
  output += `Overall: ${summary.overall} (${countLabel(
    summary.errorCount,
    "error"
  )}, ${countLabel(summary.warningCount, "warning")})${EOL}`;
  output += `Workspace: ${report.workspaceFolder || "(not set)"}${EOL}`;
  output += `Active ESP-IDF: ${version}  ${idfPath}${EOL}`;
  output += `Extension ${info.extensionVersion || "(unknown)"} | VS Code ${
    info.vscodeVersion || "(unknown)"
  } | ${info.platform} ${info.architecture} | shell ${
    info.shell || "(unknown)"
  }${EOL}`;
  output += EOL;

  const issues = summary.findings.filter(
    (finding) => finding.status === "fail" || finding.status === "warn"
  );
  output += section(
    "ISSUES",
    issues.length ? issues.map(formatIssue) : ["None."]
  );

  if (summary.overall === "FAIL") {
    output += section("ACTIONS", [DOCTOR_REPAIR_INSTRUCTION]);
  }

  output += section("Active ESP-IDF Setup", formatActiveSetupLines(report, summary));
  output += section("All ESP-IDF setups", formatSetupLines(summary.setups));
  output += section("RECENT LOG ERRORS", formatRecentLogErrors(logText));
  return output;
}

function formatIssue(finding: DiagnosticFinding): string {
  if (finding.message.includes("path contains spaces") && finding.value) {
    const segments = finding.value
      .split("\n")
      .map((segment) => `       ${segment}`)
      .join(EOL);
    return `[WARN] ${finding.label} contains a space${EOL}${segments}`;
  }
  return formatFindingLine(finding);
}

function formatActiveSetupLines(
  report: reportObj,
  summary: ReportSummary
): string[] {
  const lines: string[] = [];
  const pathOk = findingStatus(summary, "ESP-IDF Path (IDF_PATH)") === "ok";
  const toolsOk =
    findingStatus(summary, "ESP-IDF Tools Path (IDF_TOOLS_PATH)") === "ok";
  const python = findingByLabel(summary, "Python version");
  const pip = findingByLabel(summary, "pip version");
  const pythonOk = python?.status === "ok";
  const pipOk = pip?.status === "ok";

  if (pathOk && toolsOk && pythonOk && pipOk) {
    lines.push(
      `[OK] IDF_PATH, tools path, Python ${python?.value}, pip ${pip?.value}`
    );
  } else {
    if (pathOk && toolsOk) {
      lines.push("[OK] IDF_PATH, tools path");
    }
    if (pythonOk) {
      lines.push(`[OK] Python ${python?.value}`);
    }
    if (pipOk) {
      lines.push(`[OK] pip ${pip?.value}`);
    }
  }

  if (findingStatus(summary, "ESP-IDF Python requirements") === "ok") {
    lines.push("[OK] Python requirements satisfied");
  }

  const cmake = findingByLabel(summary, "CMake");
  const ninja = findingByLabel(summary, "Ninja");
  if (cmake?.status === "ok" && ninja?.status === "ok") {
    if (
      cmake.message === "found in system PATH" &&
      ninja.message === "found in system PATH"
    ) {
      lines.push("[OK] CMake and Ninja on PATH");
    } else {
      lines.push(`[OK] CMake ${cmake.message}; Ninja ${ninja.message}`);
    }
  } else if (cmake?.status === "ok") {
    lines.push(`[OK] CMake ${cmake.message}`);
  } else if (ninja?.status === "ok") {
    lines.push(`[OK] Ninja ${ninja.message}`);
  }

  const idfTools = report.espIdfToolsVersions.filter(
    (tool) => !BUILD_TOOL_NAMES.has(tool.name)
  );
  const matchedTools = idfTools.filter((tool) => tool.doesToolExist).length;
  if (idfTools.length > 0 && matchedTools === idfTools.length) {
    const noun = idfTools.length === 1 ? "tool matches" : "tools match";
    lines.push(`[OK] ${idfTools.length} ${noun} expected versions`);
  }

  const extraPaths = Object.values(report.configurationAccess.espIdfToolsPaths);
  const accessiblePaths = extraPaths.filter(Boolean).length;
  if (extraPaths.length > 0 && accessiblePaths === extraPaths.length) {
    const noun = extraPaths.length === 1 ? "path" : "paths";
    lines.push(`[OK] ${extraPaths.length} extra tool ${noun} accessible`);
  }

  const settings = report.configurationSettings;
  const target =
    settings.idfExtraVars?.IDF_TARGET ||
    settings.userExtraVars?.IDF_TARGET ||
    "(not set)";
  const port = settings.serialPort || "(not set)";
  const openOcd = settings.openOcdConfigs?.length
    ? settings.openOcdConfigs.join(", ")
    : "(not set)";
  lines.push(`Target ${target} | port ${port} | OpenOCD ${openOcd}`);
  return lines;
}

function formatSetupLines(setups: SetupReportStatus[]): string[] {
  if (!setups.length) {
    return ["None."];
  }
  const lines: string[] = [];
  for (const setup of setups) {
    const version = setup.version || "(unknown)";
    if (!setup.isValid) {
      const active = setup.isActive ? "active, " : "";
      lines.push(
        `${version}  ${active}invalid — ${setup.reason || "setup is invalid"}`
      );
      lines.push(`       ${setup.idfPath}`);
      continue;
    }
    lines.push(`${version}  ${setup.isActive ? "active" : "valid"}`);
  }
  return lines;
}

function formatRecentLogErrors(logText: string): string[] {
  const groups = summarizeLogTail(logText);
  if (!groups.length) {
    return ["None."];
  }
  return groups.map((group) => {
    const when = formatLogErrorDate(group.lastTimestamp);
    const last = when ? `, last ${when}` : "";
    return `${group.label} ×${group.count}${last}`;
  });
}

function formatDetailsReport(report: reportObj, logTail: LogTail): string {
  let output = `DETAILS${EOL}${EOL}`;
  output += `Active ESP-IDF Setup${EOL}`;
  output += formatActiveSetupDetails(report);
  output += section("All ESP-IDF setups", formatOtherSetupLines(report));
  output += section("Project files", formatProjectFileLines(report));
  output += `Recent log errors${EOL}`;
  output += formatLogSection(logTail);
  return output;
}

function formatOtherSetupLines(report: reportObj): string[] {
  if (!report.espIdfSetups.length) {
    return ["None."];
  }
  const lines: string[] = [];
  for (const idfSetup of report.espIdfSetups) {
    lines.push(`ESP-IDF setup IDF PATH: ${idfSetup.idfPath}`);
    lines.push(`------- git path: ${idfSetup.gitPath}`);
    lines.push(`------- IDF_TOOLS_PATH: ${idfSetup.toolsPath}`);
    lines.push(`------- version: ${idfSetup.version}`);
    lines.push(`------- python path: ${idfSetup.python}`);
    if (idfSetup.sysPythonPath) {
      lines.push(`------- system python path: ${idfSetup.sysPythonPath}`);
    }
    if (idfSetup.activationScript) {
      lines.push(
        `------- activation script path: ${idfSetup.activationScript}`
      );
    }
    lines.push(`------- is valid? ${idfSetup.isValid}`);
    if (idfSetup.reason) {
      lines.push(`------- reason: ${idfSetup.reason}`);
    }
  }
  return lines;
}

function formatProjectFileLines(report: reportObj): string[] {
  const lines: string[] = [];
  if (report.launchJson.trim()) {
    lines.push("launch.json:");
    lines.push(report.launchJson);
  }
  if (hasProjectJson(report.cCppPropertiesJson)) {
    lines.push("c_cpp_properties.json:");
    lines.push(
      typeof report.cCppPropertiesJson === "string"
        ? report.cCppPropertiesJson
        : JSON.stringify(report.cCppPropertiesJson, undefined, 2)
    );
  }
  return lines.length ? lines : ["None."];
}

function hasProjectJson(value: unknown): boolean {
  if (!value) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

function formatActiveSetupDetails(reportedResult: reportObj): string {
  let output = `-------------------------------------------------------- Configuration checks -------------------------------------------------------------${EOL}`;
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
  output += `Partition to use (idf.partitionToUse) ${reportedResult.configurationSettings.partitionToUse}${EOL}`;
  if (reportedResult.configurationSettings.customOpenOcdPath) {
    output += `Custom OpenOCD path (idf.customOpenOCDPath) ${reportedResult.configurationSettings.customOpenOcdPath}${EOL}`;
  }
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
    output += `CMake   ${formatStatusTag(cmake.available ? "ok" : "fail")}   ${
      cmake.source === "env"
        ? "system PATH"
        : cmake.source === "idf-tools"
        ? `ESP-IDF tools (actual: ${cmake.actual || "unknown"})`
        : "not found"
    }${EOL}`;
    output += `Ninja   ${formatStatusTag(ninja.available ? "ok" : "fail")}   ${
      ninja.source === "env"
        ? "system PATH"
        : ninja.source === "idf-tools"
        ? `ESP-IDF tools (actual: ${ninja.actual || "unknown"})`
        : "not found"
    }${EOL}`;
    for (const tool of reportedResult.espIdfToolsVersions) {
      if (tool.name === "cmake" || tool.name === "ninja") {
        continue;
      }
      const status = tool.doesToolExist ? "ok" : "fail";
      output += `Tool: ${tool.name}   expected: ${tool.expected}   actual: ${
        tool.actual || "(missing)"
      }   ${formatStatusTag(status)}${EOL}`;
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
  output += `${formatStatusTag(
    requirementsStatus
  )} Check ESP-IDF Python packages ${requirementsResult}${EOL}`;
  if (reportedResult.latestError?.message) {
    output += `----------------------------------------------------------- Latest error -----------------------------------------------------------------${EOL}`;
    output += `${reportedResult.latestError.message}${EOL}`;
  }
  output += `--------------------------------------------------------------------------------------------------------------------------------------------${EOL}`;
  return output;
}

function formatLogSection(logTail: LogTail): string {
  let output = `----------------------------------------------------------- Logfile (last ${LOG_TAIL_LINES} lines) -----------------------------------------------------------------${EOL}`;
  if (!logTail.found) {
    output += `(log file not found)${EOL}`;
    return output;
  }
  if (logTail.truncated) {
    output += `(Truncated. See esp_idf_vsc_ext.log for the full log.)${EOL}`;
  }
  output += `${logTail.text}${EOL}`;
  output += `--------------------------------------------------------------------------------------------------------------------------------------------${EOL}`;
  return output;
}

async function readLogTail(context: vscode.ExtensionContext): Promise<LogTail> {
  const logFile = join(context.extensionPath, "esp_idf_vsc_ext.log");
  if (!(await pathExists(logFile))) {
    return { found: false, text: "", truncated: false };
  }
  const logFileContent = await readFile(logFile, "utf8");
  const logLines = logFileContent.split(/\r?\n/);
  const truncated = logLines.length > LOG_TAIL_LINES;
  const raw = truncated
    ? logLines.slice(-LOG_TAIL_LINES).join(EOL)
    : logFileContent;
  return {
    found: true,
    text: replaceUserPathInStr(raw),
    truncated,
  };
}

function section(title: string, lines: string[]): string {
  return `${title}${EOL}${lines.join(EOL)}${EOL}${EOL}`;
}

function countLabel(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function findingByLabel(
  summary: ReportSummary,
  label: string
): DiagnosticFinding | undefined {
  return summary.findings.find((finding) => finding.label === label);
}

function findingStatus(
  summary: ReportSummary,
  label: string
): DiagnosticFinding["status"] | undefined {
  return findingByLabel(summary, label)?.status;
}

export function replaceUserPath(report: reportObj): reportObj {
  const strReport = JSON.stringify(report);

  // Replacing all home paths (based on OS) with '...' using es6 syntax. Can be replaced with one line using .replaceAll() when we will update the version of ECMAScript to 2021 or higher
  const parsedReport = replaceUserPathInStr(strReport);

  return parsedReport ? JSON.parse(parsedReport) : report;
}

function replaceUserPathInStr(strReport: string): string {
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
  return strReport;
}
