/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th August 2023 11:08:10 am
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
import App from "./App.vue";
import { addIcon } from "@iconify/vue";
import folder from "@iconify-icons/codicon/folder";
import folderOpen from "@iconify-icons/codicon/folder-opened";
import tools from "@iconify-icons/codicon/tools";
import symbolEvent from "@iconify-icons/codicon/symbol-event";
import refresh from "@iconify-icons/codicon/refresh";
import question from "@iconify-icons/codicon/question";
import symbolMethod from "@iconify-icons/codicon/symbol-method";
import { csv2Json } from "./util";
import { useNvsPartitionTableStore } from "./store";

addIcon("tools", tools);
addIcon("symbol-event", symbolEvent);
addIcon("refresh", refresh);
addIcon("question", question);
addIcon("symbol-method", symbolMethod);
addIcon("folder", folder);
addIcon("folder-opened", folderOpen);

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

const store = useNvsPartitionTableStore();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "openKeyFile":
      if (message.keyFilePath) {
        store.encryptKeyPath = message.keyFilePath;
      }
      break;
    case "loadInitialData":
      if (message.csv) {
        store.rows = csv2Json(message.csv);
      }
      break;
    default:
      break;
  }
});