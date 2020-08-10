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

import { ActionTree } from "vuex";
import { IState } from "./types";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const actions: ActionTree<IState, any> = {
  checkIdfPath(context) {
    vscode.postMessage({
      command: "checkIdfPath",
      new_value: context.state.idfPath,
    });
  },
  saveIdfPath(context) {
    vscode.postMessage({
      command: "saveNewIdfPath",
      idf_path: context.state.idfPath,
    });
  },
  checkManualExportPaths(context) {
    vscode.postMessage({
      command: "checkIdfToolsForPaths",
      custom_paths: context.state.customExtraPaths,
      custom_vars: context.state.envVars,
      py_bin_path: context.state.pyBinPath,
    });
  },
  getExamplesList() {
    vscode.postMessage({ command: "getExamplesList" });
  },
  getRequiredTools() {
    vscode.postMessage({ command: "getRequiredToolsInfo" });
  },
  downloadTools(context) {
    vscode.postMessage({
      command: "downloadToolsInPath",
      tools_path: context.state.idfToolsPath,
      idf_path: context.state.idfPath,
    });
  },
  saveCustomPathsEnvVars(context) {
    vscode.postMessage({
      command: "saveEnvVars",
      custom_paths: context.state.customExtraPaths,
      custom_vars: context.state.envVars,
    });
  },
  openEspIdfFolder() {
    vscode.postMessage({ command: "openEspIdfFolder" });
  },
  openToolsFolder() {
    vscode.postMessage({ command: "openToolsFolder" });
  },
  downloadEspIdf(context) {
    vscode.postMessage({
      command: "downloadEspIdfVersion",
      selectedVersion: context.state.selectedIdfVersion,
      idfPath: context.state.idfDownloadPath,
    });
  },
  requestInitValues(context) {
    vscode.postMessage({ command: "requestInitValues" });
  },
  savePythonToUse(context, pyBinPath) {
    vscode.postMessage({
      command: "savePythonBinary",
      selectedPyBin: pyBinPath,
    });
  },
  startIdfInstall(context, manualPyPath: string) {
    vscode.postMessage({
      command: "autoInstallEspIdf",
      idfPath: context.state.idfPath,
      pythonVersion: context.state.selectedPythonVersion,
      pyPath: manualPyPath,
      selectedIdfVersion: context.state.selectedIdfVersion,
    });
  },
  updateShowOnboardingOnInit(context, value) {
    vscode.postMessage({
      command: "saveShowOnboarding",
      showOnboarding: value,
    });
  },
  updateConfTarget(context, value) {
    vscode.postMessage({
      command: "updateConfigurationTarget",
      confTarget: parseInt(value, 10),
      workspaceFolder: context.state.selectedWorkspaceFolder,
    });
  },
};
