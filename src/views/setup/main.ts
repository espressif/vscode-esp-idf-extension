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
import Custom from "./Custom.vue";
import "../commons/espCommons.scss";

const routes = [
  { path: "/", component: Home },
  { path: "/autoinstall", component: Install },
  { path: "/custom", component: Custom },
];

Vue.use(VueRouter);

const router = new VueRouter({
  routes,
  base: __dirname,
});

const app = new Vue({
  el: "#app",
  components: { App },
  data: {
    isLoaded: false,
    versions: [],
  },
  router,
  template: "<App />",
  store,
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "initialLoad":
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
      if (msg.pyBinPath) {
        store.commit("setPyBinPath", msg.pyBinPath);
      }
      if (msg.toolsResults) {
        store.commit("setToolsResult", msg.toolsResults);
      }
      if (msg.hasPrerequisites) {
        store.commit("setHasPrerequisites", msg.hasPrerequisites);
      }
      break;
    case "goToCustomPage":
      if (msg.page) {
        app.$router.push("/custom");
      }
      break;
    case "updateEspIdfFolder":
      if (msg.selectedFolder) {
        store.commit("setEspIdfPath", msg.selectedFolder);
      }
      break;
    case "updateEspIdfToolsFolder":
      if (msg.selectedToolsFolder) {
        store.commit("setToolsFolder", msg.selectedToolsFolder);
      }
      break;
    case "updatePythonPath":
      if (msg.selectedPyPath) {
        store.commit("setManualPyPath", msg.selectedPyPath);
      }
      break;
    case "updatePythonVenvPath":
      if (msg.selectedPyVenvPath) {
        store.commit("setManualVenvPyPath", msg.selectedPyVenvPath);
      }
      break;
    case "updateIdfDownloadStatusPercentage":
      if (msg.percentage) {
        store.commit("setIdfDownloadStatusPercentage", msg.percentage);
      }
      break;
    case "updateIdfDownloadStatusDetail":
      if (msg.detail) {
        store.commit("setIdfDownloadStatusDetail", msg.detail);
      }
      break;
    case "setIsInstalled":
      if (msg.isInstalled) {
        store.commit("setIsIdfInstalled", msg.isInstalled);
      }
      break;
    case "setRequiredToolsInfo":
      if (msg.toolsInfo) {
        store.commit("setToolsResult", msg.toolsInfo);
      }
      break;
    default:
      break;
  }
});
