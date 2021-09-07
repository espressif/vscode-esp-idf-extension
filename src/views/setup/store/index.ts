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

import Vue from "vue";
import { ActionTree, Store, StoreOptions, MutationTree } from "vuex";
import Vuex from "vuex";
import {
  IdfMirror,
  IEspIdfLink,
  IEspIdfTool,
  IDownload,
  SetupMode,
  StatusType,
} from "../types";

export interface IState {
  areToolsValid: boolean;
  espIdf: string;
  espIdfContainer: string;
  espIdfErrorStatus: string;
  espIdfVersionList: IEspIdfLink[];
  exportedToolsPaths: string;
  exportedVars: string;
  gitVersion: string;
  hasPrerequisites: boolean;
  idfDownloadStatus: IDownload;
  idfGitDownloadStatus: IDownload;
  idfPythonDownloadStatus: IDownload;
  idfVersion: string;
  isEspIdfValid: boolean;
  isIdfInstalling: boolean;
  isIdfInstalled: boolean;
  manualPythonPath: string;
  pathSep: string;
  platform: string;
  pyExecErrorStatus: string;
  pyReqsLog: string;
  pyVersionsList: string[];
  selectedEspIdfVersion: IEspIdfLink;
  selectedIdfMirror: IdfMirror;
  selectedSysPython: string;
  setupMode: SetupMode;
  statusIdfGit: StatusType;
  statusIdfPython: StatusType;
  statusEspIdf: StatusType;
  statusEspIdfTools: StatusType;
  statusPyVEnv: StatusType;
  toolsFolder: string;
  toolsResults: IEspIdfTool[];
}

export const setupState: IState = {
  areToolsValid: false,
  espIdf: "",
  espIdfContainer: "",
  espIdfErrorStatus: "",
  espIdfVersionList: [],
  exportedToolsPaths: "",
  exportedVars: "",
  gitVersion: "",
  hasPrerequisites: false,
  idfDownloadStatus: {
    id: "",
    progress: "",
    progressDetail: "",
  },
  idfGitDownloadStatus: {
    id: "",
    progress: "",
    progressDetail: "",
  },
  idfPythonDownloadStatus: {
    id: "",
    progress: "",
    progressDetail: "",
  },
  idfVersion: "",
  isEspIdfValid: false,
  isIdfInstalling: false,
  isIdfInstalled: false,
  manualPythonPath: "",
  pathSep: "/",
  platform: "",
  pyExecErrorStatus: "",
  pyReqsLog: "",
  pyVersionsList: [],
  selectedEspIdfVersion: {
    filename: "",
    mirror: "",
    name: "",
    url: "",
  },
  selectedIdfMirror: IdfMirror.Github,
  selectedSysPython: "",
  setupMode: SetupMode.express,
  statusEspIdf: StatusType.started,
  statusEspIdfTools: StatusType.pending,
  statusIdfGit: StatusType.pending,
  statusIdfPython: StatusType.pending,
  statusPyVEnv: StatusType.pending,
  toolsFolder: "",
  toolsResults: [],
};

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const actions: ActionTree<IState, any> = {
  copyOpenOCDRules() {
    vscode.postMessage({
      command: "copyOpenOCDRules",
    });
  },
  checkEspIdfTools(context) {
    const pyPath =
      context.state.selectedSysPython ===
      context.state.pyVersionsList[context.state.pyVersionsList.length - 1]
        ? context.state.manualPythonPath
        : context.state.selectedSysPython;
    vscode.postMessage({
      command: "checkEspIdfTools",
      espIdf: context.state.espIdf,
      pyPath,
      toolsPath: context.state.toolsResults,
    });
  },
  installEspIdf(context) {
    const pyPath =
      context.state.selectedSysPython ===
      context.state.pyVersionsList[context.state.pyVersionsList.length - 1]
        ? context.state.manualPythonPath
        : context.state.selectedSysPython;
    vscode.postMessage({
      command: "installEspIdf",
      espIdfContainer: context.state.espIdfContainer,
      manualEspIdfPath: context.state.espIdf,
      mirror: context.state.selectedIdfMirror,
      selectedEspIdfVersion: context.state.selectedEspIdfVersion,
      selectedPyPath: pyPath,
      setupMode: context.state.setupMode,
      toolsPath: context.state.toolsFolder,
    });
  },
  installEspIdfTools(context) {
    const pyPath =
      context.state.selectedSysPython ===
      context.state.pyVersionsList[context.state.pyVersionsList.length - 1]
        ? context.state.manualPythonPath
        : context.state.selectedSysPython;
    vscode.postMessage({
      command: "installEspIdfTools",
      espIdf: context.state.espIdf,
      mirror: context.state.selectedIdfMirror,
      pyPath,
      toolsPath: context.state.toolsFolder,
    });
  },
  openEspIdfFolder() {
    vscode.postMessage({
      command: "openEspIdfFolder",
    });
  },
  openEspIdfContainerFolder() {
    vscode.postMessage({
      command: "openEspIdfContainerFolder",
    });
  },
  openEspIdfToolsFolder() {
    vscode.postMessage({
      command: "openEspIdfToolsFolder",
    });
  },
  openPythonPath() {
    vscode.postMessage({
      command: "openPythonPath",
    });
  },
  requestInitialValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  },
  saveCustomSettings(context) {
    const pyPath =
      context.state.selectedSysPython ===
      context.state.pyVersionsList[context.state.pyVersionsList.length - 1]
        ? context.state.manualPythonPath
        : context.state.selectedSysPython;
    vscode.postMessage({
      command: "saveCustomSettings",
      espIdfPath: context.state.espIdf,
      pyBinPath: pyPath,
      tools: context.state.toolsResults,
      toolsPath: context.state.toolsFolder,
    });
  },
  useDefaultSettings() {
    vscode.postMessage({
      command: "usePreviousSettings",
    });
  },
};

export const mutations: MutationTree<IState> = {
  setEspIdfPath(state, espIdf: string) {
    const newState = state;
    newState.espIdf = espIdf;
    Object.assign(state, newState);
  },
  setEspIdfContainerPath(state, espIdfContainer: string) {
    const newState = state;
    newState.espIdfContainer = espIdfContainer;
    Object.assign(state, newState);
  },
  setEspIdfErrorStatus(state, errorStatus: string) {
    const newState = state;
    newState.espIdfErrorStatus = errorStatus;
    Object.assign(state, newState);
  },
  setEspIdfVersionList(state, espIdfVersionList: IEspIdfLink[]) {
    const newState = state;
    newState.espIdfVersionList = espIdfVersionList;
    if (espIdfVersionList && espIdfVersionList.length > 0) {
      newState.selectedEspIdfVersion = espIdfVersionList[0];
    }
    Object.assign(state, newState);
  },
  setGitVersion(state, gitVersion) {
    const newState = state;
    newState.gitVersion = gitVersion;
    Object.assign(state, newState);
  },
  setHasPrerequisites(state, hasRequisites: boolean) {
    const newState = state;
    newState.hasPrerequisites = hasRequisites;
    Object.assign(state, newState);
  },
  setIdfMirror(state, mirrorToUse: IdfMirror) {
    const newState = state;
    newState.selectedIdfMirror = mirrorToUse;
    Object.assign(state, mirrorToUse);
  },
  setIdfDownloadStatusId(state, id: string) {
    const newState = state;
    newState.idfDownloadStatus.id = id;
    Object.assign(state, newState);
  },
  setIdfDownloadStatusPercentage(state, progress: string) {
    const newState = state;
    newState.idfDownloadStatus.progress = progress;
    Object.assign(state, newState);
  },
  setIdfDownloadStatusDetail(state, progressDetail: string) {
    const newState = state;
    newState.idfDownloadStatus.progressDetail = progressDetail;
    Object.assign(state, newState);
  },
  setIdfVersion(state, idfVersion) {
    const newState = state;
    newState.idfVersion = idfVersion;
    Object.assign(state, newState);
  },
  setIsIdfInstalled(state, isInstalled: boolean) {
    const newState = state;
    newState.isIdfInstalled = isInstalled;
    Object.assign(state, newState);
  },
  setIsIdfInstalling(state, isInstalled: boolean) {
    const newState = state;
    newState.isIdfInstalling = isInstalled;
    Object.assign(state, newState);
  },
  setManualPyPath(state, manualPyPath) {
    const newState = state;
    newState.manualPythonPath = manualPyPath;
    Object.assign(state, newState);
  },
  setPathSep(state, pathSep: string) {
    const newState = state;
    newState.pathSep = pathSep;
    Object.assign(state, newState);
  },
  setPlatform(state, platform: string) {
    const newState = state;
    newState.platform = platform;
    Object.assign(state, newState);
  },
  setPyExecErrorStatus(state, errorStatus: string) {
    const newState = state;
    newState.pyExecErrorStatus = errorStatus;
    Object.assign(state, newState);
  },
  setPyReqsLog(state, pyReqsLog: string) {
    const newState = state;
    newState.pyReqsLog = pyReqsLog;
    Object.assign(state, newState);
  },
  setPyVersionsList(state, pyVersionsList: string[]) {
    const newState = state;
    newState.pyVersionsList = pyVersionsList;
    if (pyVersionsList && pyVersionsList.length > 0) {
      newState.selectedSysPython = pyVersionsList[0];
    }
    Object.assign(state, newState);
  },
  setSelectedEspIdfVersion(state, selectedEspIdfVersion: IEspIdfLink) {
    const newState = state;
    newState.selectedEspIdfVersion = selectedEspIdfVersion;
    newState.idfDownloadStatus.id = selectedEspIdfVersion.name;
    Object.assign(state, newState);
  },
  setSelectedSysPython(state, selectedSysPython: string) {
    const newState = state;
    newState.selectedSysPython = selectedSysPython;
    Object.assign(state, newState);
  },
  setSetupMode(state, setupMode: SetupMode) {
    const newState = state;
    newState.setupMode = setupMode;
    Object.assign(state, newState);
  },
  setToolsFolder(state, toolsFolder: string) {
    const newState = state;
    newState.toolsFolder = toolsFolder;
    Object.assign(state, newState);
  },
  setToolChecksum(state, toolData: { name: string; checksum: boolean }) {
    const newState = state;
    for (let i = 0; i < newState.toolsResults.length; i++) {
      if (newState.toolsResults[i].name === toolData.name) {
        newState.toolsResults[i].hashResult = toolData.checksum;
        break;
      }
    }
    Object.assign(state, newState);
  },
  setToolDetail(state, toolData: { name: string; detail: string }) {
    const newState = state;
    for (let i = 0; i < newState.toolsResults.length; i++) {
      if (newState.toolsResults[i].name === toolData.name) {
        newState.toolsResults[i].progressDetail = toolData.detail;
        break;
      }
    }
    Object.assign(state, newState);
  },
  setToolFailed(state, toolData: { name: string; hasFailed: boolean }) {
    const newState = state;
    for (let i = 0; i < newState.toolsResults.length; i++) {
      if (newState.toolsResults[i].name === toolData.name) {
        newState.toolsResults[i].hasFailed = toolData.hasFailed;
        break;
      }
    }
    Object.assign(state, newState);
  },
  setToolPercentage(state, toolData: { name: string; percentage: string }) {
    const newState = state;
    for (let i = 0; i < newState.toolsResults.length; i++) {
      if (newState.toolsResults[i].name === toolData.name) {
        newState.toolsResults[i].progress = toolData.percentage;
        break;
      }
    }
    Object.assign(state, newState);
  },
  setToolsResult(state, toolsResults: IEspIdfTool[]) {
    const newState = state;
    newState.toolsResults = toolsResults;
    Object.assign(state, newState);
  },
  setStatusEspIdf(state, status: StatusType) {
    const newState = state;
    newState.statusEspIdf = status;
    if (status === StatusType.installed) {
      newState.idfDownloadStatus.progress = "100.00%";
    }
    Object.assign(state, newState);
  },
  setStatusEspIdfTools(state, status: StatusType) {
    const newState = state;
    newState.statusEspIdfTools = status;
    if (status === StatusType.installed) {
      for (let i = 0; i < newState.toolsResults.length; i++) {
        newState.toolsResults[i].progress = "100.00%";
      }
    }
    Object.assign(state, newState);
  },
  setStatusPyVEnv(state, status: StatusType) {
    const newState = state;
    newState.statusPyVEnv = status;
    Object.assign(state, newState);
  },
  setIdfGitPercentage(state, statusData: { name: string; percentage: string }) {
    const newState = state;
    newState.idfGitDownloadStatus.id = statusData.name;
    newState.idfGitDownloadStatus.progress = statusData.percentage;
    Object.assign(state, newState);
  },
  setIdfGitDetail(state, statusData: { name: string; detail: string }) {
    const newState = state;
    newState.idfGitDownloadStatus.progressDetail = statusData.detail;
    Object.assign(state, newState);
  },
  setStatusIdfPython(state, status: StatusType) {
    const newState = state;
    newState.statusIdfPython = status;
    if (status === StatusType.installed) {
      newState.idfPythonDownloadStatus.progress = "100.00%";
    }
    Object.assign(state, newState);
  },
  setIdfPythonPercentage(
    state,
    statusData: { name: string; percentage: string }
  ) {
    const newState = state;
    newState.idfPythonDownloadStatus.id = statusData.name;
    newState.idfPythonDownloadStatus.progress = statusData.percentage;
    Object.assign(state, newState);
  },
  setIdfPythonDetail(state, statusData: { name: string; detail: string }) {
    const newState = state;
    newState.idfPythonDownloadStatus.progressDetail = statusData.detail;
    Object.assign(state, newState);
  },
  setStatusIdfGit(state, status: StatusType) {
    const newState = state;
    newState.statusIdfGit = status;
    if (status === StatusType.installed) {
      newState.idfGitDownloadStatus.progress = "100.00%";
    }
    Object.assign(state, newState);
  },
};

export const setupStore: StoreOptions<IState> = {
  actions,
  mutations,
  state: setupState,
};

Vue.use(Vuex);

export const store = new Store(setupStore);
