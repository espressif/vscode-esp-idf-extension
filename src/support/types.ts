/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:19:16 pm
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

import { IdfSetup } from "../eim/types";
import { ProjectConfElement } from "../project-conf/projectConfiguration";

export interface ConfigurationAccess {
  espIdfPath: boolean;
  espAdfPath: boolean;
  espIdfToolsPaths: { [key: string]: boolean };
  pythonBinPath: boolean;
  cmakeInEnv: boolean;
  ninjaInEnv: boolean;
  toolsPath: boolean;
  customOpenOcdPath: boolean;
}
export interface Configuration {
  systemEnvPath: string;
  espIdfPath: string;
  espAdfPath: string;
  customExtraPaths: string;
  flashType: string;
  flashPartitionToUse: string;
  idfExtraVars: { [key: string]: string };
  userExtraVars: { [key: string]: string };
  notificationMode: string;
  pythonBinPath: string;
  pythonPackages: pyPkgVersion[];
  serialPort: string;
  openOcdLaunchArgs: string[];
  openOcdConfigs: string[];
  openOCDDebugLevel: string;
  toolsPath: string;
  customTerminalExecutable: string;
  customTerminalExecutableArgs: string[];
  customOpenOcdPath: string;
  gitPath: string;
}

export interface ConfigurationSpacesValidation {
  systemEnvPath: boolean;
  espIdfPath: boolean;
  espAdfPath: boolean;
  customExtraPaths: { [key: string]: boolean };
  pythonBinPath: boolean;
  toolsPath: boolean;
}

export interface SystemInfo {
  architecture: string;
  envIdfPythonEnvPath: string;
  envPath: string;
  envPython: string;
  extensionVersion: string;
  language: string;
  shell: string;
  platform: string;
  systemName: string;
  vscodeVersion: string;
  remoteName: string;
  appName: string;
}

export interface pyPkgVersion {
  name: string;
  version: string;
}

export interface idfToolResult {
  actual: string;
  doesToolExist: boolean;
  expected: string;
  name: string;
}

export interface execResult {
  output: string;
  result: string;
}

export interface ExtendedIdfSetup extends IdfSetup {
  reason: string;
}

export type CheckStatus = "ok" | "fail" | "warn" | "skip";

export interface DiagnosticFinding {
  status: CheckStatus;
  category: string;
  label: string;
  settingKey?: string;
  value?: string;
  message: string;
}

export interface ReportSummary {
  overall: "PASS" | "FAIL" | "WARN";
  findings: DiagnosticFinding[];
  errorCount: number;
  warningCount: number;
}

export interface ConfigCheckLine {
  label: string;
  value: string;
  status: CheckStatus;
  message: string;
}

export interface BuildToolAvailability {
  available: boolean;
  source: "env" | "idf-tools" | "none";
  actual?: string;
}

export interface reportObj {
  configurationSettings: Configuration;
  configurationAccess: ConfigurationAccess;
  configurationSpacesValidation: ConfigurationSpacesValidation;
  espIdfSetups: ExtendedIdfSetup[];
  espIdfToolsVersions: idfToolResult[];
  espIdfVersion: execResult;
  latestError: Error;
  launchJson: string;
  cCppPropertiesJson: any;
  pipVersion: execResult;
  projectConfigurations: { [key: string]: ProjectConfElement };
  pythonVersion: execResult;
  pythonPackages: execResult;
  idfCheckRequirements: execResult;
  formatedOutput: string;
  selectedProjectConfiguration: string;
  systemInfo: SystemInfo;
  workspaceFolder: string;
  reportSummary?: ReportSummary;
}
