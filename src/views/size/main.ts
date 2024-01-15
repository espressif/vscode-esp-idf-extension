/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 6th September 2023 7:22:49 pm
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
import { useSizeStore } from "./store";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.mount("#app");

const store = useSizeStore();

window.addEventListener("message", (m: any) => {
  const msg = m.data;
  switch (msg.command) {
    case "initialLoad":
      store.archives = msg.archives;
      store.overviewData = msg.overview;
      store.setFiles(msg.files);
      break;
    default:
      break;
  }
});