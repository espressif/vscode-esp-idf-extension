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
import { CSV2JSON } from "./util";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { PartitionTable, usePartitionTableStore } from "./store";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

app.mount("#app");

const store = usePartitionTableStore();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "loadInitialData": {
      const rows = message.csv
        ? CSV2JSON<PartitionTable.Row>(message.csv)
        : [];
      const offset = Number(message.partitionTableOffset);
      store.loadInitial(
        rows,
        Number(message.flashSizeBytes) || 0,
        Number.isFinite(offset) && offset >= 0 ? offset : 0x8000
      );
      break;
    }
    case "pasteCsvData":
      if (typeof message.csv === "string") {
        store.consumePaste(message.csv);
      }
      break;
    default:
      break;
  }
});