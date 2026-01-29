/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 28th August 2023 5:17:50 pm
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
import { createRouter, createWebHashHistory } from "vue-router";
import NewProject from "./App.vue";
import Configure from "./Configure.vue";
import Templates from "./Templates.vue";
import { useNewProjectStore } from "./store";


import ProjectCreated from "./ProjectCreated.vue";

const routes = [
  { path: "/", component: Templates },
  { path: "/configure", component: Configure },
  { path: "/templates", component: Templates },
  { path: "/created", component: ProjectCreated },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(NewProject);
const pinia = createPinia();
app.use(pinia);
app.use(router);
app.mount("#app");

const store = useNewProjectStore();

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "goToBeginning":
      router.push("/");
      break;
    case "addComponentPath":
      if (msg.component) {
        store.components.push(msg.component);
      }
      break;
    case "initialLoad":
      if (msg.boards && msg.boards.length > 0) {
        store.boards = msg.boards;
        store.selectedBoard = msg.boards[0];
      }
      if (msg.projectName) {
        store.projectName = msg.projectName;
      }
      if (msg.containerDirectory) {
        store.containerDirectory = msg.containerDirectory;
      }
      if (msg.serialPortList) {
        store.serialPortList = msg.serialPortList;
        store.selectedPort = msg.serialPortList[0];
      }
      if (msg.templates) {
        store.templatesRootPath = msg.templates;
      }
      if (msg.openOcdConfigFiles) {
        store.openOcdConfigFiles = msg.openOcdConfigFiles;
      }
      if (msg.idfTargets) {
        store.idfTargets = msg.idfTargets;
        store.selectedIdfTarget = msg.idfTargets[0];
      }
      if (msg.pathSep) {
        store.pathSep = msg.pathSep;
      }
      break;
    case "setContainerDirectory":
      if (msg.projectDirectory) {
        store.containerDirectory = msg.projectDirectory;
      }
      break;
    case "setExampleDetail":
      if (msg.templateDetail) {
        store.templateDetail = msg.templateDetail;
        store.hasTemplateDetail = true;
      }
      break;
    case "projectCreated":
      if (msg.resultingProjectPath) {
        store.resultingProjectPath = msg.resultingProjectPath;        
      }
      router.push("/created");
      break;
    default:
      break;
  }
});
