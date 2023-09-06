/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th August 2023 6:24:06 pm
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
import tools from "@iconify-icons/codicon/tools";
import symbolEvent from "@iconify-icons/codicon/symbol-event";
import refresh from "@iconify-icons/codicon/refresh";
import question from "@iconify-icons/codicon/question";
import starEmpty from "@iconify-icons/codicon/star-empty";
import { addIcon } from "@iconify/vue";
import { CSV2JSON } from "./util";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { PartitionTable, usePartitionTableStore } from "./store";

addIcon("tools", tools);
addIcon("symbol-event", symbolEvent);
addIcon("refresh", refresh);
addIcon("question", question);
addIcon("star-empty", starEmpty);

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

app.mount("#app");

const store = usePartitionTableStore();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "loadInitialData":
      if (message.csv) {
        const rows = CSV2JSON<PartitionTable.Row>(message.csv);
        store.rows = rows;
      }
      break;
    default:
      break;
  }
});