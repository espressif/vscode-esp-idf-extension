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
import { IEspIdfLink, IEspIdfTool } from "../types";

export interface IState {
  areToolsValid: boolean;
  espIdf: string;
  espIdfVersionList: IEspIdfLink[];
  exportedToolsPaths: string;
  exportedVars: string;
  gitVersion: string;
  hasPrerequisites: boolean;
  isEspIdfValid: boolean;
  isInstalled: boolean;
  isVirtualEnvPyPathValid: boolean;
  manualSysPython: string;
  manualVEnvPython: string;
  pyVersionsList: string[];
  selectedEspIdfVersion: IEspIdfLink;
  selectedSysPython: string;
  toolsFolder: string;
  toolsResults: IEspIdfTool[];
  virtualEnvPyPath: string;
}

export const setupState: IState = {
  areToolsValid: false,
  espIdf: "",
  espIdfVersionList: [],
  exportedToolsPaths: "",
  exportedVars: "",
  gitVersion: "",
  hasPrerequisites: false,
  isEspIdfValid: false,
  isInstalled: false,
  isVirtualEnvPyPathValid: false,
  manualSysPython: "",
  manualVEnvPython: "",
  pyVersionsList: [],
  selectedEspIdfVersion: {
    filename: "",
    mirror: "",
    name: "",
    url: "",
  },
  selectedSysPython: "",
  toolsFolder: "",
  toolsResults: [],
  virtualEnvPyPath: "",
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
  customInstallEspIdf(context) {
    const pyPath =
      context.state.selectedSysPython === "Provide python executable path"
        ? context.state.manualSysPython
        : context.state.selectedSysPython;
    vscode.postMessage({
      command: "installEspIdfOnly",
      selectedEspIdfVersion: context.state.selectedEspIdfVersion,
      selectedPyPath: pyPath,
      manualEspIdfPath: context.state.espIdf,
    });
  },
  installEspIdf(context) {
    const pyPath =
      context.state.selectedSysPython === "Provide python executable path"
        ? context.state.manualSysPython
        : context.state.selectedSysPython;
    vscode.postMessage({
      command: "installEspIdf",
      selectedEspIdfVersion: context.state.selectedEspIdfVersion,
      selectedPyPath: pyPath,
      manualEspIdfPath: context.state.espIdf,
    });
  },
  method(context) {
    vscode.postMessage({
      command: "command",
      value: context.state.espIdf,
    });
  },
  openEspIdfFolder() {
    vscode.postMessage({
      command: "openEspIdfFolder",
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
  openPyVenvPath() {
    vscode.postMessage({
      command: "openPyVenvPath",
    });
  },
  requestInitialValues() {
    vscode.postMessage({
      command: "requestInitialValues",
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
  setIsInstalled(state, isInstalled: boolean) {
    const newState = state;
    newState.isInstalled = isInstalled;
    Object.assign(state, newState);
  },
  setManualPyPath(state, manualPyPath) {
    const newState = state;
    newState.manualSysPython = manualPyPath;
    Object.assign(state, newState);
  },
  setManualVenvPyPath(state, manualVenvPyPath) {
    const newState = state;
    newState.manualVEnvPython = manualVenvPyPath;
    Object.assign(state, newState);
  },
  setPyBinPath(state, pyBinPath) {
    const newState = state;
    newState.virtualEnvPyPath = pyBinPath;
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
    Object.assign(state, newState);
  },
  setSelectedSysPython(state, selectedSysPython: string) {
    const newState = state;
    newState.selectedSysPython = selectedSysPython;
    Object.assign(state, newState);
  },
  setToolsFolder(state, toolsFolder: string) {
    const newState = state;
    newState.toolsFolder = toolsFolder;
    Object.assign(state, newState);
  },
  setToolsResult(state, toolsResults: IEspIdfTool[]) {
    const newState = state;
    newState.toolsResults = toolsResults;
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
