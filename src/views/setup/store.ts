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
  let pyReqsLog: Ref<string> = ref("");
  let pyVersionsList: Ref<string[]> = ref([]);
  let saveScope: Ref<number> = ref(1);
  let selectedEspIdfVersion: Ref<IEspIdfLink> = ref({
    filename: "",
    mirror: "",
    name: "",
    url: "",
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

  function checkEspIdfTools() {
    const pyPath =
      selectedSysPython === pyVersionsList[pyVersionsList.value.length - 1]
        ? manualPythonPath
        : selectedSysPython;
    vscode.postMessage({
      command: "checkEspIdfTools",
      espIdf: espIdf,
      pyPath,
      toolsPath: toolsResults,
    });
  }

  function installEspIdf() {
    const pyPath =
      selectedSysPython === pyVersionsList[pyVersionsList.value.length - 1]
        ? manualPythonPath
        : selectedSysPython;
    vscode.postMessage({
      command: "installEspIdf",
      espIdfContainer: espIdfContainer,
      manualEspIdfPath: espIdf,
      mirror: selectedIdfMirror,
      selectedEspIdfVersion: selectedEspIdfVersion,
      selectedPyPath: pyPath,
      setupMode: setupMode,
      toolsPath: toolsFolder,
      saveScope: saveScope,
    });
  }

  function installEspIdfTools() {
    const pyPath =
      selectedSysPython === pyVersionsList[pyVersionsList.value.length - 1]
        ? manualPythonPath
        : selectedSysPython;
    vscode.postMessage({
      command: "installEspIdfTools",
      espIdf: espIdf,
      mirror: selectedIdfMirror,
      pyPath,
      toolsPath: toolsFolder,
      saveScope: saveScope,
    });
  }

  function openEspIdfFolder() {
    vscode.postMessage({
      command: "openEspIdfFolder",
    });
  }
  function openEspIdfContainerFolder() {
    vscode.postMessage({
      command: "openEspIdfContainerFolder",
    });
  }
  function openEspIdfToolsFolder() {
    vscode.postMessage({
      command: "openEspIdfToolsFolder",
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
      selectedSysPython === pyVersionsList[pyVersionsList.value.length - 1]
        ? manualPythonPath
        : selectedSysPython;
    vscode.postMessage({
      command: "saveCustomSettings",
      espIdfPath: espIdf,
      pyBinPath: pyPath,
      tools: toolsResults,
      toolsPath: toolsFolder,
      saveScope: saveScope,
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
      saveScope: saveScope,
    });
  }

  function cleanIdfSetups() {
    idfSetups.value = [];
    vscode.postMessage({
      command: "cleanIdfSetups",
    });
  }

  function setEspIdfVersionList(espIdfVersionList: IEspIdfLink[]) {
    espIdfVersionList = espIdfVersionList;
    if (espIdfVersionList && espIdfVersionList.length > 0) {
      selectedEspIdfVersion.value = espIdfVersionList[0];
    }
  }

  function setPyVersionsList(pyVersionsList: string[]) {
    pyVersionsList = pyVersionsList;
    if (pyVersionsList && pyVersionsList.length > 0) {
      selectedSysPython.value = pyVersionsList[0];
    }
  }

  function setSelectedEspIdfVersion(selectedEspIdfVersion: IEspIdfLink) {
    selectedEspIdfVersion = selectedEspIdfVersion;
    idfDownloadStatus.value.id = selectedEspIdfVersion.name;
  }

  function setToolChecksum(toolData: { name: string; checksum: boolean }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults[i].name === toolData.name) {
        toolsResults[i].hashResult = toolData.checksum;
        break;
      }
    }
  }

  function setToolDetail(toolData: { name: string; detail: string }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults[i].name === toolData.name) {
        toolsResults[i].progressDetail = toolData.detail;
        break;
      }
    }
  }

  function setToolFailed(toolData: { name: string; hasFailed: boolean }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults[i].name === toolData.name) {
        toolsResults[i].hasFailed = toolData.hasFailed;
        break;
      }
    }
  }

  function setToolPercentage(toolData: { name: string; percentage: string }) {
    for (let i = 0; i < toolsResults.value.length; i++) {
      if (toolsResults[i].name === toolData.name) {
        toolsResults[i].progress = toolData.percentage;
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
        toolsResults[i].progress = "100.00%";
      }
    }
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
    cleanIdfSetups,
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
    setIdfPythonPercentage
  };
});
