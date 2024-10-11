/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 31st August 2023 12:31:23 pm
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
import { useProjectConfStore } from "./store";
import ProjectConfig from "./ProjectConfigEditor.vue";

const app = createApp(ProjectConfig);
const pinia = createPinia();
app.use(pinia);
app.mount("#editor");

const store = useProjectConfStore();

window.addEventListener("message", (event: MessageEvent) => {
  let msg = Object.create(null);
  msg = event.data;
  switch (msg.command) {
    case "setBuildPath":
      if (msg.confKey) {
        store.updateConfigElement({
          confKey: msg.confKey,
          sections: msg.sectionsKeys,
          newValue: msg.buildPath,
        });
      }
      break;
    case "setFilePath":
      if (msg.confKey) {
        store.updateConfigElement({
          confKey: msg.confKey,
          sections: msg.sectionsKeys,
          newValue: msg.newPath,
        });
      }
      break;
    case "initialLoad":
      if (msg.confList) {
        store.elements = msg.confList;
      }
    default:
      break;
  }
});
