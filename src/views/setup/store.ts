/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 31st August 2023 8:12:24 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { defineStore } from "pinia";
import { ref, Ref } from "vue";
import {
  IdfMirror,
  IdfSetup,
  IDownload,
  IEspIdfLink,
  IEspIdfTool,
  SetupMode,
  StatusType,
} from "./types";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const useSetupStore = defineStore("setup", () => {
  let espIdfVersion: Ref<string> = ref("");
  let areToolsValid: Ref<boolean> = ref(false);
  let espIdf: Ref<string> = ref("");
  let espIdfContainer: Ref<string> = ref("");
  let espIdfErrorStatus: Ref<string> = ref("");
  let espIdfVersionList: Ref<IEspIdfLink[]> = ref([]);
  let espIdfTags: Ref<IEspIdfLink[]> = ref([]);
  let exportedToolsPaths: Ref<string> = ref("");
  let exportedVars: Ref<{ [key: string]: string }> = ref({});
  let gitVersion: Ref<string> = ref("");
  let hasPrerequisites: Ref<boolean> = ref(false);
  let idfDownloadStatus: Ref<IDownload> = ref({
    id: "",
    progress: "",
    progressDetail: "",
  });
  let idfGitDownloadStatus: Ref<IDownload> = ref({
    id: "",
    progress: "",
    progressDetail: "",
  });
  let idfPythonDownloadStatus: Ref<IDownload> = ref({
    id: "",
    progress: "",
    progressDetail: "",
  });
  let idfSetups: Ref<IdfSetup[]> = ref([]);
  let isEspIdfValid: Ref<boolean> = ref(false);
  let isIdfInstalling: Ref<boolean> = ref(false);
  let isIdfInstalled: Ref<boolean> = ref(false);
  let manualPythonPath: Ref<string> = ref("");
  let openOCDRulesPath: Ref<string> = ref("");
  let pathSep: Ref<string> = ref("/");
  let platform: Ref<string> = ref("");
  let pyExecErrorStatus: Ref<string> = ref("");
  let whiteSpaceErrorIDF: Ref<string> = ref("");
  let whiteSpaceErrorTools: Ref<string> = ref("");
  let whiteSpaceErrorIDFContainer: Ref<string> = ref("");
  let pyReqsLog: Ref<string> = ref("");
  let pyVersionsList: Ref<string[]> = ref([]);
  let saveScope: Ref<number> = ref(1);
  let selectedEspIdfVersion: Ref<IEspIdfLink> = ref({
    filename: "",
    mirror: "",
    name: "",
    url: "",
    version: "",
  });
  let selectedIdfMirror: Ref<IdfMirror> = ref(IdfMirror.Github);
  let selectedSysPython: Ref<string> = ref("");
  let setupMode: Ref<SetupMode> = ref(SetupMode.express);
  let showIdfTagList: Ref<boolean> = ref(false);
  let statusEspIdf: Ref<StatusType> = ref(StatusType.started);
  let statusEspIdfTools: Ref<StatusType> = ref(StatusType.pending);
  let statusIdfGit: Ref<StatusType> = ref(StatusType.pending);
  let statusIdfPython: Ref<StatusType> = ref(StatusType.pending);
  let statusPyVEnv: Ref<StatusType> = ref(StatusType.pending);
  let toolsFolder: Ref<string> = ref("");
  let toolsResults: Ref<IEspIdfTool[]> = ref([]);
  let extensionVersion: Ref<string> = ref("");
  let idfPathError: Ref<string> = ref("");
  let isInstallButtonDisabled: Ref<boolean> = ref(false);

  function clearIdfPathError() {
    idfPathError.value = "";
    isInstallButtonDisabled.value = false;
  }

  function setIdfPathError(error: string) {
    idfPathError.value = error;
    isInstallButtonDisabled.value = !!error;
  }

  function validateEspIdfPath(path: string) {
    clearIdfPathError();
    vscode.postMessage({
      command: "canAccessFile",
      path,
      currentVersion: espIdfVersion.value,
    });
  }

  function openEspIdfFolder(): Promise<string | undefined> {
    return new Promise((resolve) => {
      vscode.postMessage({
        command: "openEspIdfFolder",
      });
      window.addEventListener("message", function handler(event) {
        if (event.data.command === "updateEspIdfFolder") {
          window.removeEventListener("message", handler);
          resolve(event.data.selectedFolder);
        }
      });
    });
  }

  function openEspIdfContainerFolder(): Promise<string | undefined> {
    return new Promise((resolve) => {
      vscode.postMessage({
        command: "openEspIdfContainerFolder",
      });
      window.addEventListener("message", function handler(event) {
        if (event.data.command === "updateEspIdfContainerFolder") {
          window.removeEventListener("message", handler);
          resolve(event.data.selectedContainerFolder);
        }
      });
    });
  }

  function openEspIdfToolsFolder(): Promise<string | undefined> {
    return new Promise((resolve) => {
      vscode.postMessage({
        command: "openEspIdfToolsFolder",
      });
      window.addEventListener("message", function handler(event) {
        if (event.data.command === "updateEspIdfToolsFolder") {
          window.removeEventListener("message", handler);
          resolve(event.data.selectedToolsFolder);
        }
      });
    });
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.command === "canAccessFileResponse") {
      if (!message.exists) {
        setIdfPathError(
          "The path for ESP-IDF is not valid: /tools/idf.py not found."
        );
      } else {
        setIdfPathError("");
      }
    }
  });

  function checkEspIdfTools() {
    const pyPath =
      selectedSysPython === pyVersionsList[pyVersionsList.value.length - 1]
        ? manualPythonPath
        : selectedSysPython;
    console.log({
      command: "checkEspIdfTools",
      espIdf: espIdf.value,
      pyPath,
      toolsPath: JSON.stringify(toolsResults.value),
    });
    vscode.postMessage({
      command: "checkEspIdfTools",
      espIdf: espIdf.value,
      pyPath,
      toolsPath: JSON.stringify(toolsResults.value),
    });
  }

  function installEspIdf() {
    const pyPath =
      selectedSysPython.value ===
      pyVersionsList.value[pyVersionsList.value.length - 1]
        ? manualPythonPath.value
        : selectedSysPython.value;
    vscode.postMessage({
      command: "installEspIdf",
      espIdfContainer: espIdfContainer.value,
      manualEspIdfPath: espIdf.value,
      mirror: selectedIdfMirror.value,
      selectedEspIdfVersion: JSON.stringify(selectedEspIdfVersion.value),
      selectedPyPath: pyPath,
      setupMode: setupMode.value,
      toolsPath: toolsFolder.value,
      saveScope: saveScope.value,
    });
  }

  function installEspIdfTools() {
    const pyPath =
      selectedSysPython.value ===
      pyVersionsList.value[pyVersionsList.value.length - 1]
        ? manualPythonPath.value
        : selectedSysPython.value;
    vscode.postMessage({
      command: "installEspIdfTools",
      espIdf: espIdf.value,
      mirror: selectedIdfMirror.value,
      pyPath,
      toolsPath: toolsFolder.value,
      saveScope: saveScope.value,
    });
  }

  function openPythonPath() {
    vscode.postMessage({
      command: "openPythonPath",
    });
  }

  function requestInitialValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  }

  function saveCustomSettings() {
    const pyPath =
      selectedSysPython.value ===
      pyVersionsList.value[pyVersionsList.value.length - 1]
        ? manualPythonPath.value
        : selectedSysPython.value;
    vscode.postMessage({
      command: "saveCustomSettings",
      espIdfPath: espIdf.value,
      pyBinPath: pyPath,
      tools: JSON.stringify(toolsResults.value),
      toolsPath: toolsFolder.value,
      saveScope: saveScope.value,
    });
  }

  function useDefaultSettings() {
    vscode.postMessage({
      command: "usePreviousSettings",
    });
  }

  function useIdfSetup(payload: number) {
    vscode.postMessage({
      command: "useIdfSetup",
      selectedIdfSetup: payload,
      saveScope: saveScope.value,
    });
  }

  function exploreComponents() {
    vscode.postMessage({
      command: "exploreComponents",
    });
  }

  function openImportProject() {
    vscode.postMessage({
      command: "importProject",
    });
  }

  function openNewProjectPanel() {
    vscode.postMessage({
      command: "newProject",
    });
  }
  function openShowExamplesPanel() {
    vscode.postMessage({
      command: "showExamples",
    });
  }
  function requestInitValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  }

  function setEspIdfVersionList(espIdfVerList: IEspIdfLink[]) {
    espIdfVersionList.value = espIdfVerList;
    if (espIdfVerList && espIdfVerList.length > 0) {
      selectedEspIdfVersion.value = espIdfVerList[0];
    }
  }

  function setPyVersionsList(pyVerList: string[]) {
    pyVersionsList.value = pyVerList;
    if (pyVerList && pyVerList.length > 0) {
      selectedSysPython.value = pyVerList[0];
    }
  }

  function setSelectedEspIdfVersion(selectedEspIdfVer: IEspIdfLink) {
    selectedEspIdfVersion.value = selectedEspIdfVer;
    espIdfVersion.value = selectedEspIdfVer.version;
    idfDownloadStatus.value.id = selectedEspIdfVer.name;
    // Trigger validation whenever the version changes
    if (espIdf.value) {
      validateEspIdfPath(espIdf.value);
    }
  }

  function setToolChecksum(toolData: { name: string; checksum: boolean }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults.value[i].name === toolData.name) {
        toolsResults.value[i].hashResult = toolData.checksum;
        break;
      }
    }
  }

  function setToolDetail(toolData: { name: string; detail: string }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults.value[i].name === toolData.name) {
        toolsResults.value[i].progressDetail = toolData.detail;
        break;
      }
    }
  }

  function setToolFailed(toolData: { name: string; hasFailed: boolean }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults.value[i].name === toolData.name) {
        toolsResults.value[i].hasFailed = toolData.hasFailed;
        break;
      }
    }
  }

  function setToolPercentage(toolData: { name: string; percentage: string }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults.value[i].name === toolData.name) {
        toolsResults.value[i].progress = toolData.percentage;
        break;
      }
    }
  }

  function setStatusEspIdf(status: StatusType) {
    statusEspIdf.value = status;
    if (status === StatusType.installed) {
      idfDownloadStatus.value.progress = "100.00%";
    }
  }

  function setStatusEspIdfTools(status: StatusType) {
    statusEspIdfTools.value = status;
    if (status === StatusType.installed) {
      for (let i = 0; i < toolsResults.value.length; i++) {
        toolsResults.value[i].progress = "100.00%";
      }
    }
    moveToPySection();
  }

  function setSelectedDownloadMirror(mirror: IdfMirror) {
    selectedIdfMirror.value =
      mirror === IdfMirror.Espressif ? IdfMirror.Espressif : IdfMirror.Github;
  }

  function moveToPySection() {
    let content = document.getElementById("espidftools") as HTMLDivElement;
    if (content) {
      content.style.display = "none";
    }
    content = document.getElementById("espidf") as HTMLDivElement;
    if (content) {
      content.style.display = "none";
    }
    const secNew = document.querySelector("#py-install-status") as HTMLElement;
    const configList = document.querySelector("#scrollable") as HTMLElement;
    if (secNew) {
      const endPosition = secNew.getBoundingClientRect().bottom;
      configList.scrollTo({ left: 0, top: endPosition - 10, behavior: "auto" });
    }
  }

  function toggleContent(containerId: string) {
    var content = document.getElementById(containerId) as HTMLDivElement;
    content.style.display === "flex"
      ? (content.style.display = "none")
      : (content.style.display = "flex");
  }

  function setStatusIdfGit(status: StatusType) {
    statusIdfGit.value = status;
    if (status === StatusType.installed) {
      idfGitDownloadStatus.value.progress = "100.00%";
    }
  }

  function setStatusIdfPython(status: StatusType) {
    statusIdfPython.value = status;
    if (status === StatusType.installed) {
      idfPythonDownloadStatus.value.progress = "100.00%";
    }
  }

  function setIdfPythonPercentage(statusData: {
    name: string;
    percentage: string;
  }) {
    idfPythonDownloadStatus.value.id = statusData.name;
    idfPythonDownloadStatus.value.progress = statusData.percentage;
  }

  return {
    areToolsValid,
    espIdf,
    espIdfContainer,
    espIdfErrorStatus,
    espIdfVersionList,
    espIdfTags,
    exportedToolsPaths,
    exportedVars,
    extensionVersion,
    gitVersion,
    hasPrerequisites,
    idfDownloadStatus,
    idfGitDownloadStatus,
    idfPythonDownloadStatus,
    idfSetups,
    isEspIdfValid,
    isIdfInstalling,
    isIdfInstalled,
    manualPythonPath,
    moveToPySection,
    openOCDRulesPath,
    pathSep,
    platform,
    pyExecErrorStatus,
    pyReqsLog,
    pyVersionsList,
    saveScope,
    selectedEspIdfVersion,
    selectedIdfMirror,
    selectedSysPython,
    setupMode,
    showIdfTagList,
    statusIdfGit,
    statusIdfPython,
    statusEspIdf,
    statusEspIdfTools,
    statusPyVEnv,
    toolsFolder,
    toolsResults,
    checkEspIdfTools,
    installEspIdf,
    installEspIdfTools,
    openEspIdfFolder,
    openEspIdfContainerFolder,
    openEspIdfToolsFolder,
    openPythonPath,
    requestInitialValues,
    saveCustomSettings,
    useDefaultSettings,
    useIdfSetup,
    setEspIdfVersionList,
    setPyVersionsList,
    setSelectedEspIdfVersion,
    setToolChecksum,
    setToolDetail,
    setToolFailed,
    setToolPercentage,
    setStatusEspIdf,
    setStatusEspIdfTools,
    setStatusIdfGit,
    setStatusIdfPython,
    setIdfPythonPercentage,
    setSelectedDownloadMirror,
    exploreComponents,
    openImportProject,
    openNewProjectPanel,
    openShowExamplesPanel,
    requestInitValues,
    toggleContent,
    whiteSpaceErrorIDF,
    whiteSpaceErrorTools,
    whiteSpaceErrorIDFContainer,
    idfPathError,
    isInstallButtonDisabled,
    setIdfPathError,
    validateEspIdfPath,
    clearIdfPathError,
    espIdfVersion,
  };
});
