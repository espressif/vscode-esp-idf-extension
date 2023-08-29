/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd August 2023 2:50:54 pm
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
import { useWelcomeStore } from "./store";
import { addIcon } from "@iconify/vue";
import comment from "@iconify-icons/codicon/comment-discussion";
import folder from "@iconify-icons/codicon/folder";
import folderOpened from "@iconify-icons/codicon/folder-opened";
import github from "@iconify-icons/codicon/github";
import newFolder from "@iconify-icons/codicon/new-folder";
import gear from "@iconify-icons/codicon/gear";
import beaker from "@iconify-icons/codicon/beaker";
import typeHierarchy from "@iconify-icons/codicon/type-hierarchy";
addIcon("beaker", beaker);
addIcon("comment", comment);
addIcon("folder", folder);
addIcon("folder-opened", folderOpened);
addIcon("gear", gear);
addIcon("github", github);
addIcon("new-folder", newFolder);
addIcon("type-hierarchy", typeHierarchy);

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
const store = useWelcomeStore();

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "initialLoad":
      console.log(msg);
      if (msg.extensionVersion) {
        store.extensionVersion = msg.extensionVersion;
      }
      if (msg.espIdf) {
        store.espIdf = msg.espIdf;
      }
      if (msg.showOnInit) {
        store.showOnInit = msg.showOnInit;
      }
      break;

    default:
      break;
  }
});