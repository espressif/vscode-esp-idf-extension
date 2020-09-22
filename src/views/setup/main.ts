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
import VueRouter from "vue-router";
import { store } from "./store";
// @ts-ignore
import App from "./App.vue";
// @ts-ignore
import Home from "./Home.vue";
// @ts-ignore
import Install from "./Install.vue";
// @ts-ignore
import Status from "./Status.vue";
import "../commons/espCommons.scss";

const routes = [
  { path: "/", component: Home },
  { path: "/autoinstall", component: Install },
  { path: "/status", component: Status },
];

Vue.use(VueRouter);

const router = new VueRouter({
  routes,
  base: __dirname,
});

const app = new Vue({
  components: { App },
  data: {
    isLoaded: false,
    versions: [],
  },
  el: "#app",
  router,
  store,
  template: "<App />",
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "goToCustomPage":
      if (msg.page) {
        app.$router.push(msg.page);
      }
      if (typeof msg.installing !== undefined) {
        store.commit("setIsIdfInstalling", msg.installing);
      }
      break;
    case "initialLoad":
      if (msg.espToolsPath) {
        store.commit("setToolsFolder", msg.espToolsPath);
      }
      if (msg.idfVersions) {
        store.commit("setEspIdfVersionList", msg.idfVersions);
      }
      if (msg.pyVersionList) {
        store.commit("setPyVersionsList", msg.pyVersionList);
      }
      if (msg.gitVersion) {
        store.commit("setGitVersion", msg.gitVersion);
      }
      if (msg.espIdf) {
        store.commit("setEspIdfPath", msg.espIdf);
      }
      if (msg.espIdfContainer) {
        store.commit("setEspIdfContainerPath", msg.espIdfContainer);
      }
      if (msg.pyBinPath) {
        store.commit("setManualPyPath", msg.pyBinPath);
      }
      if (msg.toolsResults) {
        store.commit("setToolsResult", msg.toolsResults);
      }
      if (msg.hasPrerequisites) {
        store.commit("setHasPrerequisites", msg.hasPrerequisites);
      }
      break;
    case "setEspIdfErrorStatus":
      if (msg.errorMsg) {
        store.commit("setEspIdfErrorStatus", msg.errorMsg);
        store.commit("setIsIdfInstalling", false);
      }
      break;
    case "setIsIdfInstalling":
      if (typeof msg.installing !== undefined) {
        store.commit("setIsIdfInstalling", msg.installing);
      }
      break;
    case "setIsInstalled":
      if (msg.isInstalled) {
        store.commit("setIsIdfInstalled", msg.isInstalled);
      }
      break;
    case "setPyExecErrorStatus":
      if (msg.errorMsg) {
        store.commit("setPyExecErrorStatus", msg.errorMsg);
        store.commit("setIsIdfInstalling", false);
      }
      break;
    case "setRequiredToolsInfo":
      if (msg.toolsInfo) {
        store.commit("setToolsResult", msg.toolsInfo);
      }
      break;
    case "updateEspIdfFolder":
      if (msg.selectedFolder) {
        store.commit("setEspIdfPath", msg.selectedFolder);
      }
      break;
    case "updateEspIdfContainerFolder":
      console.log(msg);
      if (msg.selectedContainerFolder) {
        store.commit("setEspIdfContainerPath", msg.selectedContainerFolder);
      }
      break;
    case "updateEspIdfStatus":
      if (typeof msg.status !== undefined) {
        store.commit("setStatusEspIdf", msg.status);
      }
      break;
    case "updateEspIdfToolsFolder":
      if (msg.selectedToolsFolder) {
        store.commit("setToolsFolder", msg.selectedToolsFolder);
      }
      break;
    case "updateEspIdfToolsStatus":
      if (msg.status) {
        store.commit("setStatusEspIdfTools", msg.status);
      }
      break;
    case "updateIdfDownloadStatusDetail":
      if (msg.detail) {
        store.commit("setIdfDownloadStatusDetail", msg.detail);
      }
      if (msg.id) {
        store.commit("setIdfDownloadStatusId", msg.id);
      }
      break;
    case "updateIdfDownloadStatusPercentage":
      if (msg.percentage) {
        store.commit("setIdfDownloadStatusPercentage", msg.percentage);
      }
      if (msg.id) {
        store.commit("setIdfDownloadStatusId", msg.id);
      }
      break;
    case "updatePkgChecksumResult":
      if (msg.id && msg.hashResult) {
        store.commit("setToolChecksum", {
          name: msg.id,
          checksum: msg.hashResult,
        });
      }
      break;
    case "updatePkgDownloadDetail":
      if (msg.id && msg.progressDetail) {
        store.commit("setToolDetail", {
          name: msg.id,
          detail: msg.progressDetail,
        });
      }
      break;
    case "updatePkgDownloadFailed":
      if (msg.id && msg.hasFailed) {
        store.commit("setToolFailed", {
          name: msg.id,
          hasFailed: msg.hasFailed,
        });
      }
      break;
    case "updatePkgDownloadPercentage":
      if (msg.id && msg.percentage) {
        store.commit("setToolPercentage", {
          name: msg.id,
          percentage: msg.percentage,
        });
      }
      break;
    case "updatePyReqsLog":
      if (msg.pyReqsLog) {
        store.commit("setPyReqsLog", msg.pyReqsLog);
      }
      break;
    case "updatePythonPath":
      if (msg.selectedPyPath) {
        store.commit("setManualPyPath", msg.selectedPyPath);
      }
      break;
    case "updatePyVEnvStatus":
      if (msg.status) {
        store.commit("setStatusPyVEnv", msg.status);
      }
      break;
    default:
      break;
  }
});
