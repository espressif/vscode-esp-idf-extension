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
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import Vue from "vue";
import VueRouter from "vue-router";
import App from "./App.vue";
import Components from "./Components.vue";
import Espidf from "./EspIdf.vue";
import Examples from "./Examples.vue";
import IdfComponent from "./components/idfComponent.vue";
import ProjectLocation from "./ProjectLocation.vue";
import TargetConf from "./TargetConf.vue";
import Tool from "./components/tool.vue";

import { store } from "./store";
import {
  faArrowLeft,
  faCheck,
  faFolder,
  faFolderOpen,
  faPlusSquare,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

Vue.use(VueRouter);
const routes = [
  { path: "/", component: Espidf },
  { path: "/examples", component: Examples },
  { path: "/components", component: Components },
  { path: "/target-settings", component: TargetConf },
  { path: "/project-location", component: ProjectLocation },
];

export const router = new VueRouter({
  base: __dirname,
  routes,
});

library.add(
  faArrowLeft,
  faCheck,
  faFolder,
  faFolderOpen,
  faPlusSquare,
  faTimes
);
Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.component("idfComponent", IdfComponent);
Vue.component("tool", Tool);

new Vue({
  el: "#app",
  components: { App },
  store,
  router,
  template: "<App />",
});

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "component_list_add_path":
      if (message.new_component) {
        store.commit("addComponent", message.new_component);
      }
      break;
    case "idf_tools_check_done":
      if (message.allIsValid) {
        store.commit("setIsValid", message.allIsValid);
      }
      break;
    case "load_adapter_target":
      if (message.idfTarget) {
        store.commit("setIdfTarget", message.idfTarget);
      }
      break;
    case "load_current_idf_version":
      if (message.idfVersion) {
        store.commit("setIdfPathVersion", message.idfVersion);
      }
      if (message.idfPath) {
        store.commit("setSelectedIdf", message.idfPath);
      }
      break;
    case "load_examples":
      if (message.examples) {
        store.commit("setTemplates", message.examples);
      }
      break;
    case "load_idf_versions":
      if (message.idfVersions) {
        store.commit("setIdfVersions", message.idfVersions);
      }
      if (message.selectedIdf) {
        store.commit("setSelectedIdf", message.selectedIdf);
      }
      break;
    case "load_openocd_config_files":
      if (message.openOcdConfigFilesList) {
        store.commit("setOpenOcdCfgs", message.openOcdConfigFilesList);
      }
      break;
    case "load_py_venvs":
      if (message.pyVenvList) {
        store.commit("setPyEnvList", message.pyVenvList);
      }
      if (message.selectedVenv) {
        store.commit("setSelectedVenv", message.selectedVenv);
      }
      break;
    case "load_tools_list":
      if (message.tools) {
        store.commit("setToolsList", message.tools);
      }
      break;
    case "set_project_directory":
      if (message.projectDirectory) {
        store.commit("setProjectDirectory", message.projectDirectory);
      }
      break;
    default:
      break;
  }
});
