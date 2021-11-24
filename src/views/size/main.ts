/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Sunday, 16th June 2019 12:29:20 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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
import { store } from "./store";
// @ts-ignore
import App from "./App.vue";
import IconifyIcon from "@iconify/vue";
import symbolEvent from "@iconify-icons/codicon/symbol-event";
import refresh from "@iconify-icons/codicon/refresh";
import server from "@iconify-icons/codicon/server";
import screenNormal from "@iconify-icons/codicon/screen-normal";
import search from "@iconify-icons/codicon/search";
import fileZip from "@iconify-icons/codicon/file-zip";
import chevronDown from "@iconify-icons/codicon/chevron-down";
import chevronUp from "@iconify-icons/codicon/chevron-up";
import { isNumber } from "util";
IconifyIcon.addIcon("symbol-event", symbolEvent);
IconifyIcon.addIcon("refresh", refresh);
IconifyIcon.addIcon("server", server);
IconifyIcon.addIcon("screen-normal", screenNormal);
IconifyIcon.addIcon("search", search);
IconifyIcon.addIcon("file-zip", fileZip);
IconifyIcon.addIcon("chevron-down", chevronDown);
IconifyIcon.addIcon("chevron-up", chevronUp);
Vue.component("iconify-icon", IconifyIcon);

// Vue App
const app = new Vue({
  el: "#app",
  components: { App },
  template: "<App />",
  store,
});

// Message Receiver
declare var window: any;
window.addEventListener("message", (m: any) => {
  const msg = m.data;
  switch (msg.command) {
    case "initialLoad":
      store.commit("setArchive", msg.archives);
      store.commit("setOverviewData", msg.overview);
      store.commit("setFiles", msg.files);
      break;
    default:
      break;
  }
});
