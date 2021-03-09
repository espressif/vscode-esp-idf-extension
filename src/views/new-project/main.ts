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
// @ts-ignore
import App from "./App.vue";
// @ts-ignore
import Configure from "./Configure.vue";
// @ts-ignore
import Templates from "./Templates.vue";
import { store } from "./store";
import IconifyIcon from "@iconify/vue";
import add from "@iconify-icons/codicon/add";
import close from "@iconify-icons/codicon/close";
import folder from "@iconify-icons/codicon/folder";
import folderOpen from "@iconify-icons/codicon/folder-opened";
IconifyIcon.addIcon("add", add);
IconifyIcon.addIcon("close", close);
IconifyIcon.addIcon("folder", folder);
IconifyIcon.addIcon("folder-opened", folderOpen);
Vue.component("iconify-icon", IconifyIcon);

Vue.use(VueRouter);
const routes = [
  { path: "/", component: Configure },
  { path: "/templates", component: Templates },
];

export const router = new VueRouter({
  base: __dirname,
  routes,
});

const app = new Vue({
  el: "#app",
  components: { App },
  router,
  store,
  template: "<App />",
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "goToBeginning":
      app.$router.push("/");
    case "addComponentPath":
      if (msg.component) {
        store.commit("addComponent", msg.component);
      }
      break;
    case "initialLoad":
      if (msg.boards && msg.boards.length > 0) {
        store.commit("setBoards", msg.boards);
        store.commit("setSelectedBoard", msg.boards[0]);
      }
      if (msg.projectName) {
        store.commit("setProjectName", msg.projectName);
      }
      if (msg.containerDirectory) {
        store.commit("setContainerDirectory", msg.containerDirectory);
      }
      if (msg.serialPortList) {
        store.commit("setSerialPortList", msg.serialPortList);
        store.commit("setSelectedPort", msg.serialPortList[0]);
      }
      if (msg.targetList) {
        store.commit("setTargetList", msg.targetList);
        store.commit("setTarget", msg.targetList[0]);
      }
      if (msg.templates) {
        store.commit("setTemplates", msg.templates);
        store.commit("setSelectedTemplate", msg.templates[0]);
      }
      if (msg.openOcdConfigFiles) {
        store.commit("setOpenOcdConfigFiles", msg.openOcdConfigFiles);
      }
      break;
    case "setContainerDirectory":
      if (msg.projectDirectory) {
        store.commit("setContainerDirectory", msg.projectDirectory);
      }
      break;
    case "setExampleDetail":
      if (msg.templateDetail) {
        store.commit("setTemplateDetail", msg.templateDetail);
      }
      break;
    default:
      break;
  }
});
