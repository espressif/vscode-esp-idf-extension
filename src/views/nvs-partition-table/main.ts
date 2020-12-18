/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 15th December 2020 7:21:27 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Vue from "vue";
// @ts-ignore
import App from "./App.vue";
import store from "./store";
import IconifyIcon from "@iconify/vue";
import folder from "@iconify-icons/codicon/folder";
import folderOpen from "@iconify-icons/codicon/folder-opened";
import tools from "@iconify-icons/codicon/tools";
import symbolEvent from "@iconify-icons/codicon/symbol-event";
import refresh from "@iconify-icons/codicon/refresh";
import question from "@iconify-icons/codicon/question";
import symbolMethod from "@iconify-icons/codicon/symbol-method";
import { CSV2JSON } from "./util";

IconifyIcon.addIcon("tools", tools);
IconifyIcon.addIcon("symbol-event", symbolEvent);
IconifyIcon.addIcon("refresh", refresh);
IconifyIcon.addIcon("question", question);
IconifyIcon.addIcon("symbol-method", symbolMethod);
IconifyIcon.addIcon("folder", folder);
IconifyIcon.addIcon("folder-opened", folderOpen);

Vue.component("iconify-icon", IconifyIcon);

new Vue({
  store,
  render: (h) => h(App),
}).$mount("#app");

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "openKeyFile":
      if (message.keyFilePath) {
        store.commit("setEncryptKeyPath", message.keyFilePath);
      }
      break;
    case "loadInitialData":
      if (message.csv) {
        const rows = CSV2JSON(message.csv);
        store.commit("SET_ROWS", rows);
      }
      break;
    default:
      break;
  }
});
