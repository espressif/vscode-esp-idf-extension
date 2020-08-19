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

import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowCircleDown,
  faArrowLeft,
  faCheck,
  faFolder,
  faFolderOpen,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import Vue from "vue";
import VueRouter from "vue-router";
import { store } from "./store";
// @ts-ignore
import App from "./App.vue";
// @ts-ignore
import Home from "./Home.vue";
import "../commons/espCommons.scss";

const routes = [{ path: "/", component: Home }];

Vue.use(VueRouter);

const router = new VueRouter({
  routes,
  base: __dirname,
});

library.add(
  faArrowLeft,
  faArrowCircleDown,
  faCheck,
  faFolder,
  faFolderOpen,
  faTimes
);
Vue.component("font-awesome-icon", FontAwesomeIcon);

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
      break;
    case "updateEspIdfFolder":
      if (msg.selectedFolder) {
        store.commit("setEspIdfPath", msg.selectedFolder);
      }
      break;
    case "updatePythonPath":
      if (msg.selectedPyPath) {
        store.commit("setManualPyPath", msg.selectedPyPath);
      }
    default:
      break;
  }
});
