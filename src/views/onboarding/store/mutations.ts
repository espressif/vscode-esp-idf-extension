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

import { MutationTree } from "vuex";
import {
  IEspIdfLink,
  IEspIdfStatus,
  IState,
  IToolStatus,
  IToolVersionResult,
} from "./types";

export const mutations: MutationTree<IState> = {
  setCustomExtraPaths(state, newCustomExtraPaths: string) {
    const newState = state;
    newState.customExtraPaths = newCustomExtraPaths;
    Object.assign(state, newState);
  },
  setIdfPath(state, newPath: string) {
    const newState = state;
    newState.idfPath = newPath;
    Object.assign(state, newState);
  },
  setIdfDownloadPath(state, newPath: string) {
    const newState = state;
    newState.idfDownloadPath = newPath;
    Object.assign(state, newState);
  },
  setIsIDFZipExtracted(state, val: boolean) {
    const newState = state;
    newState.isIDFZipExtracted = val;
    Object.assign(state, newState);
  },
  showIdfPathCheck(state, areCheckVisible: boolean) {
    const newState = state;
    newState.showIdfPathCheck = areCheckVisible;
    Object.assign(state, newState);
  },
  updateDoesIdfPathExist(state, isThereAnIdfBinary: boolean) {
    const newState = state;
    newState.doesIdfPathExist = isThereAnIdfBinary;
    Object.assign(state, newState);
  },
  setEnvVars(state, newEnvVarsValues: object) {
    const newState = state;
    newState.envVars = newEnvVarsValues;
    Object.assign(state, newState);
  },
  setIdfToolsPath(state, newPath: string) {
    const newState = state;
    newState.idfToolsPath = newPath;
    Object.assign(state, newState);
  },
  setGitVersion(state, gitVersion: string) {
    const newState = state;
    newState.gitVersion = gitVersion;
    Object.assign(state, newState);
  },
  setPyVersionList(state, pyVersionList: string[]) {
    const newState = state;
    newState.pyVersionList = pyVersionList;
    newState.selectedPythonVersion = pyVersionList[0];
    Object.assign(state, newState);
  },
  setPythonBinPath(state, pythonBinPath: string) {
    const newState = state;
    newState.pyBinPath = pythonBinPath;
    Object.assign(state, newState);
  },
  setPyLog(state, pyLog: string) {
    const newState = state;
    newState.pyLog = pyLog;
    Object.assign(state, newState);
  },
  setToolSetupMode(state, setupMode: string) {
    const newState = state;
    newState.toolsSelectedSetupMode = setupMode;
    if (setupMode === "empty") {
      newState.isInstallationCompleted = false;
    }
    Object.assign(state, newState);
  },
  setToolCheckFinish(state, isCompleted: boolean) {
    const newState = state;
    newState.isToolsCheckCompleted = isCompleted;
    Object.assign(state, newState);
  },
  setToolSetupFinish(state) {
    const newState = state;
    newState.isInstallationCompleted = true;
    Object.assign(state, newState);
  },
  setPySetupFinish(state, isPySetupFinish) {
    const newState = state;
    newState.isPyInstallCompleted = isPySetupFinish;
    Object.assign(state, newState);
  },
  setShowIdfToolsChecks(state, areChecksVisible: boolean) {
    const newState = state;
    newState.showIdfToolsChecks = areChecksVisible;
    Object.assign(state, newState);
  },
  setShowOnboardingOnInit(state, showOnboardingOnInit: boolean) {
    const newState = state;
    newState.showOnboardingOnInit = showOnboardingOnInit;
    Object.assign(state, newState);
  },
  setToolsCheckResults(state, checkResults: IToolVersionResult[]) {
    const newState = state;
    newState.toolsCheckResults = checkResults;
    Object.assign(state, newState);
  },
  setPathDelimiter(state, pathDelimiter: string) {
    const newState = state;
    newState.pathDelimiter = pathDelimiter;
    Object.assign(state, newState);
  },
  setRequiredToolsVersion(state, requiredToolsVersions: IToolStatus[]) {
    const newState = state;
    newState.requiredToolsVersions = requiredToolsVersions;
    Object.assign(state, newState);
  },
  setSelectedPythonVersion(state, newPythonSelected) {
    const newState = state;
    newState.selectedPythonVersion = newPythonSelected;
    Object.assign(state, newState);
  },
  setEspIdfVersionList(state, idfVersionList: IEspIdfLink[]) {
    const newState = state;
    newState.idfVersionList = idfVersionList;
    newState.selectedIdfVersion = idfVersionList[0];
    newState.idfDownloadStatus = {
      id: idfVersionList[0].name,
      progress: "0.00%",
      progressDetail: "",
    };
    Object.assign(state, newState);
  },
  setSelectedIdfVersion(state, selectedVersion: IEspIdfLink) {
    const newState = state;
    newState.selectedIdfVersion = selectedVersion;
    newState.idfDownloadStatus = {
      id: selectedVersion.name,
      progress: "0.00%",
      progressDetail: "",
    };
    Object.assign(state, newState);
  },
  setSelectedIdfDownloadState(state, selectedState: string) {
    const newState = state;
    newState.idfDownloadState = selectedState;
    newState.isIDFZipExtracted = false;
    newState.downloadedIdfZipPath = "";
    Object.assign(state, newState);
  },
  setSelectedWorkspaceFolder(state, newWorkspaceFolder: string) {
    const newState = state;
    newState.selectedWorkspaceFolder = newWorkspaceFolder;
    Object.assign(state, newState);
  },
  setWorkspaceFolders(state, workspaceFolders: string[]) {
    const newState = state;
    newState.workspaceFolders = workspaceFolders;
    newState.selectedWorkspaceFolder = workspaceFolders[0];
    Object.assign(state, newState);
  },
  setDownloadedZipPath(state, downloadedIdfZipPath: string) {
    const newState = state;
    newState.downloadedIdfZipPath = downloadedIdfZipPath;
    Object.assign(state, newState);
  },
  updateIdfVersion(state, idfVersion) {
    const newState = state;
    newState.idfVersion = idfVersion;
    Object.assign(state, newState);
  },
  updatePkgDownloadPercentage(state, pkgUpdatePercentage: IToolStatus) {
    const newState = state;
    newState.requiredToolsVersions = state.requiredToolsVersions.map(
      (pkgInfo) => {
        const newPkgPercentage: IToolStatus = {
          expected: pkgInfo.expected,
          hashResult: pkgInfo.hashResult,
          id: pkgInfo.id,
          progress: pkgUpdatePercentage.progress,
          progressDetail: pkgInfo.progressDetail,
          hasFailed: pkgInfo.hasFailed,
        };
        return pkgInfo.id === pkgUpdatePercentage.id
          ? newPkgPercentage
          : pkgInfo;
      }
    );
    Object.assign(state, newState);
  },
  updatePkgHashResult(state, pkgUpdateHashResult: IToolStatus) {
    const newState = state;
    newState.requiredToolsVersions = state.requiredToolsVersions.map(
      (pkgInfo) => {
        const newPkg: IToolStatus = {
          expected: pkgInfo.expected,
          hashResult: pkgUpdateHashResult.hashResult,
          id: pkgInfo.id,
          progress: pkgInfo.progress,
          progressDetail: pkgInfo.progressDetail,
          hasFailed: pkgInfo.hasFailed,
        };
        return pkgInfo.id === pkgUpdateHashResult.id ? newPkg : pkgInfo;
      }
    );
    Object.assign(state, newState);
  },
  updateDownloadDetail(state, updatedPkgDownloadDetail) {
    const newState = state;
    newState.requiredToolsVersions = state.requiredToolsVersions.map(
      (pkgInfo) => {
        const newPkg: IToolStatus = {
          expected: pkgInfo.expected,
          hashResult: pkgInfo.hashResult,
          id: pkgInfo.id,
          progress: pkgInfo.progress,
          progressDetail: updatedPkgDownloadDetail.progressDetail,
          hasFailed: pkgInfo.hasFailed,
        };
        return pkgInfo.id === updatedPkgDownloadDetail.id ? newPkg : pkgInfo;
      }
    );
    Object.assign(state, newState);
  },
  updatePkgFailed(state, updatePkgFailed) {
    const newState = state;
    newState.requiredToolsVersions = state.requiredToolsVersions.map(
      (pkgInfo) => {
        const newPkg: IToolStatus = {
          expected: pkgInfo.expected,
          hashResult: pkgInfo.hashResult,
          id: pkgInfo.id,
          progress: pkgInfo.progress,
          progressDetail: pkgInfo.progressDetail,
          hasFailed: updatePkgFailed.hasFailed,
        };
        return pkgInfo.id === updatePkgFailed.id ? newPkg : pkgInfo;
      }
    );
    Object.assign(state, newState);
  },
  updateConfTarget(state, confTarget) {
    const newState = state;
    newState.selectedConfTarget = confTarget;
    Object.assign(state, newState);
  },
  updateIdfDownloadDetail(state, updatedIdfDownloadDetail: IEspIdfStatus) {
    const newState = state;
    newState.idfDownloadStatus = {
      id: newState.idfDownloadStatus.id,
      progress: newState.idfDownloadStatus.progress,
      progressDetail: updatedIdfDownloadDetail.progressDetail,
    };
    Object.assign(state, newState);
  },
  updateIdfDownloadProgress(state, updatedIdfDownloadProgress: IEspIdfStatus) {
    const newState = state;
    newState.idfDownloadStatus = {
      id: newState.idfDownloadStatus.id,
      progress: updatedIdfDownloadProgress.progress,
      progressDetail: newState.idfDownloadStatus.progressDetail,
    };
    Object.assign(state, newState);
  },
};
