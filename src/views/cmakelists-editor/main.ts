/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 24th August 2023 10:12:39 am
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
import CMakeListsEditor from "../cmakelists-editor/CmakeListsEditor.vue";
import { useCMakeListsEditorStore } from "./store";
import { addIcon } from "@iconify/vue";
import add from "@iconify-icons/codicon/add";
import close from "@iconify-icons/codicon/close";
addIcon("add", add);
addIcon("close", close);

const app = createApp(CMakeListsEditor);

const pinia = createPinia();
app.use(pinia);
app.mount("#editor");

const store = useCMakeListsEditorStore();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "loadElements":
      if (message.elements) {
        store.elements = message.elements;
      }
      break;
    case "loadEmptyElements":
      if (message.elements) {
        store.emptyElements = message.elements;
      }
    case "setFileName":
      if (message.fileName) {
        store.fileName = message.fileName;
      }
      break;
    default:
      break;
  }
});