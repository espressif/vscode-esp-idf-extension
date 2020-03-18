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

import { IPath, ITool } from "../../../ITool";

export interface IToolVersionResult {
  actual: string;
  doesToolExist: boolean;
  expected: string;
  id: string;
}

export interface IToolStatus {
  expected: string;
  hashResult: boolean;
  hasFailed: boolean;
  id: string;
  progress: string;
  progressDetail: string;
}

export interface IEspIdfLink {
  filename: string;
  name: string;
  mirror: string;
  url: string;
}

export interface IEspIdfStatus {
  id: string;
  progress: string;
  progressDetail: string;
}

export interface IState {
  customExtraPaths: string;
  downloadedIdfZipPath: string;
  doesIdfPathExist: boolean;
  envVars: object;
  gitVersion: string;
  idfPath: string;
  idfDownloadPath: string;
  idfDownloadStatus: IEspIdfStatus;
  idfDownloadState: string;
  idfToolsPath: string;
  idfVersion: string;
  idfVersionList: IEspIdfLink[];
  idfVersionsMetadata: IPath[];
  isIDFZipExtracted: boolean;
  isInstallationCompleted: boolean;
  isPyInstallCompleted: boolean;
  isToolsCheckCompleted: boolean;
  pathDelimiter: string;
  previousIdfVersion: string;
  previousIsValid: boolean;
  pyBinPath: string;
  pyLog: string;
  pyVersionList: string[];
  pythonSysPathIsValid: boolean;
  requiredToolsVersions: IToolStatus[];
  selectedConfTarget: number;
  selectedIdfMetadata: IPath;
  selectedIdfVersion: IEspIdfLink;
  selectedPythonVersion: string;
  selectedWorkspaceFolder: string;
  selectedVenvMetadata: IPath;
  showIdfPathCheck: boolean;
  showIdfToolsChecks: boolean;
  showOnboardingOnInit: boolean;
  toolsCheckResults: IToolVersionResult[];
  toolsInMetadata: ITool[];
  toolsSelectedSetupMode: string;
  workspaceFolders: string[];
  venvVersionsMetadata: IPath[];
}
