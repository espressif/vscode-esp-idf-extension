/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th November 2021 3:08:47 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import Vue from "vue";
import Vuex from "vuex";
import { store } from "./store";
// @ts-ignore
import App from "./App.vue";
import IconifyIcon from "@iconify/vue";
import comment from "@iconify-icons/codicon/comment-discussion";
import folder from "@iconify-icons/codicon/folder";
import github from "@iconify-icons/codicon/github";
IconifyIcon.addIcon("comment", comment);
IconifyIcon.addIcon("folder", folder);
IconifyIcon.addIcon("github", github);
Vue.component("iconify-icon", IconifyIcon);

const app = new Vue({
  components: { App },
  el: "#app",
  store,
  template: "<App />",
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "initialLoad":
      console.log(msg);
      if (msg.extensionVersion) {
        store.commit("setExtensionVersion", msg.extensionVersion);
      }
      if (msg.espIdf) {
        store.commit("setEspIdf", msg.espIdf);
      }
      break;

    default:
      break;
  }
});
