/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 31st August 2023 8:11:44 pm
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

import { createApp } from "vue";
import { createPinia } from "pinia";
import { useSetupStore } from "./store";
import { addIcon } from "@iconify/vue";
import ExistingSetup from "./ExistingSetup.vue";
import check from "@iconify-icons/codicon/check";
import close from "@iconify-icons/codicon/close";
import folder from "@iconify-icons/codicon/folder";
import folderOpen from "@iconify-icons/codicon/folder-opened";
import home from "@iconify-icons/codicon/home";
import loading from "@iconify-icons/codicon/loading";
import App from "./App.vue";
import ToolsCustom from "./ToolsCustom.vue";
import Home from "./Home.vue";
import Install from "./Install.vue";
import Status from "./Status.vue";
import { createRouter, createWebHashHistory } from "vue-router";

addIcon("check", check);
addIcon("close", close);
addIcon("folder", folder);
addIcon("folder-opened", folderOpen);
addIcon("home", home);
addIcon("loading", loading);

const routes = [
  { path: "/", component: Home },
  { path: "/existingsetup", component: ExistingSetup },
  { path: "/autoinstall", component: Install },
  { path: "/custom", component: ToolsCustom },
  { path: "/status", component: Status },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.mount("#app");

const store = useSetupStore();

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "goToCustomPage":
      if (msg.page) {
        router.push(msg.page);
      }
      if (typeof msg.installing !== "undefined") {
        store.isIdfInstalling = msg.installing;
      }
      break;
    case "initialLoad":
      if (msg.espToolsPath) {
        store.toolsFolder = msg.espToolsPath;
      }
      if (msg.idfVersions) {
        store.setEspIdfVersionList(msg.idfVersions);
      }
      if (msg.idfTags) {
        store.espIdfTags = msg.idfTags;
      }
      if (msg.idfSetups) {
        store.idfSetups = msg.idfSetups;
      }
      if (msg.pyVersionList) {
        store.setPyVersionsList(msg.pyVersionList);
      }
      if (msg.gitVersion) {
        store.gitVersion = msg.gitVersion;
      }
      if (msg.espIdf) {
        store.espIdf = msg.espIdf;
      }
      if (msg.espIdfContainer) {
        store.espIdfContainer = msg.espIdfContainer;
      }
      if (msg.hasPrerequisites) {
        store.hasPrerequisites = msg.hasPrerequisites;
      }
      if (msg.pathSep) {
        store.pathSep = msg.pathSep;
      }
      if (msg.platform) {
        store.platform = msg.platform;
      }
      break;
    case "setEspIdfErrorStatus":
      if (typeof msg.errorMsg !== "undefined") {
        store.espIdfErrorStatus = msg.errorMsg;
        store.isIdfInstalling = false;
      }
      break;
    case "setIsIdfInstalling":
      if (typeof msg.installing !== "undefined") {
        store.isIdfInstalling = msg.installing;
      }
      break;
    case "setIsInstalled":
      if (msg.isInstalled) {
        store.isIdfInstalled = msg.isIdfInstalled;
      }
      break;
    case "setOpenOcdRulesPath":
      if (msg.openOCDRulesPath) {
        store.openOCDRulesPath = msg.openOCDRulesPath;
      }
      break;
    case "setPyExecErrorStatus":
      if (msg.errorMsg) {
        store.isIdfInstalling = false;
        store.pyExecErrorStatus = msg.errorMsg;
      }
      break;
    case "setRequiredToolsInfo":
      if (msg.toolsInfo) {
        store.toolsResults = msg.toolsInfo;
      }
      break;
    case "setSetupMode":
      if (typeof msg.setupMode !== "undefined") {
        store.setupMode = msg.setupMode;
      }
      break;
    case "updateEspIdfFolder":
      if (msg.selectedFolder) {
        store.espIdf = msg.selectedFolder;
      }
      break;
    case "updateEspIdfContainerFolder":
      if (msg.selectedContainerFolder) {
        store.espIdfContainer = msg.selectedContainerFolder;
      }
      break;
    case "updateEspIdfStatus":
      if (typeof msg.status !== "undefined") {
        store.setStatusEspIdf(msg.status);
      }
      break;
    case "updateEspIdfToolsFolder":
      if (msg.selectedToolsFolder) {
        store.toolsFolder = msg.selectedToolsFolder;
      }
      break;
    case "updateEspIdfToolsStatus":
      if (msg.status) {
        store.setStatusEspIdfTools(msg.status);
      }
      break;
    case "updateIdfDownloadStatusDetail":
      if (msg.detail) {
        store.idfDownloadStatus.progressDetail = msg.detail;
      }
      if (msg.id) {
        store.idfDownloadStatus.id = msg.id;
      }
      break;
    case "updateIdfDownloadStatusPercentage":
      if (msg.percentage) {
        store.idfDownloadStatus.progress = msg.percentage;
      }
      if (msg.id) {
        store.idfDownloadStatus.id = msg.id;
      }
      break;
    case "updatePkgChecksumResult":
      if (msg.id && msg.hashResult) {
        store.setToolChecksum({
          name: msg.id,
          checksum: msg.hashResult,
        });
      }
      break;
    case "updatePkgDownloadDetail":
      if (msg.id && msg.progressDetail) {
        store.setToolDetail({
          name: msg.id,
          detail: msg.progressDetail,
        });
      }
      break;
    case "updatePkgDownloadFailed":
      if (msg.id && msg.hasFailed) {
        store.setToolFailed({
          name: msg.id,
          hasFailed: msg.hasFailed,
        });
      }
      break;
    case "updatePkgDownloadPercentage":
      if (msg.id && msg.percentage) {
        store.setToolPercentage({
          name: msg.id,
          percentage: msg.percentage,
        });
      }
      break;
    case "updatePyReqsLog":
      if (msg.pyReqsLog) {
        store.pyReqsLog = msg.pyReqsLog;
      }
      break;
    case "updatePythonPath":
      if (msg.selectedPyPath) {
        store.manualPythonPath = msg.selectedPyPath;
      }
      break;
    case "updatePyVEnvStatus":
      if (msg.status) {
        store.statusPyVEnv = msg.status;
      }
      break;
    case "updateIdfGitDownloadPercentage":
      if (msg.id && msg.percentage) {
        store.idfGitDownloadStatus.id = msg.id;
        store.idfGitDownloadStatus.progress = msg.percentage;
      }
      break;
    case "updateIdfGitDownloadDetail":
      if (msg.id && msg.detail) {
        store.idfGitDownloadStatus.progressDetail = msg.detail;
      }
      break;
    case "updateIdfPythonDownloadPercentage":
      if (msg.id && msg.percentage) {
        store.setIdfPythonPercentage({
          name: msg.id,
          percentage: msg.percentage,
        });
      }
      break;
    case "updateIdfPythonDownloadDetail":
      if (msg.id && msg.detail) {
        store.idfPythonDownloadStatus.progressDetail = msg.detail;
      }
      break;
    case "updateIdfGitStatus":
      if (msg.status) {
        store.setStatusIdfGit(msg.status);
      }
      break;
    case "updateIdfPythonStatus":
      if (msg.status) {
        store.setStatusIdfPython(msg.status);
      }
      break;
    default:
      break;
  }
});
