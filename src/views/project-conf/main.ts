/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 6th January 2023 3:56:09 pm
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

import Vue from "vue";
// @ts-ignore
import ProjectConfig from "./ProjectConfigEditor.vue";
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

const app = new Vue({
  el: "#editor",
  components: { ProjectConfig },
  store,
  template: "<ProjectConfig />",
});

window.addEventListener("message", (event: MessageEvent) => {
  let msg = Object.create(null);
  msg = event.data;
  switch (msg.command) {
    case "setBuildPath":
      if (msg.confKey) {
        store.commit("updateConfigElement", {
          confKey: msg.confKey,
          sections: msg.sectionsKeys,
          newValue: msg.buildPath,
        });
      }
      break;
    case "initialLoad":
      if (msg.confList) {
        store.commit("setConfigList", msg.confList);
      }
    default:
      break;
  }
});
