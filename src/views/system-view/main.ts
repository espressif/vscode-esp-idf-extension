/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th September 2023 9:48:57 am
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
import { fillEventTable } from "./table";
import { drawPlot } from "./plot";
import { eventNameMap } from "./util";
import { fillStatsTable } from "./stats";
import { useSystemViewStore } from "./store";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.mount("#app");
const store = useSystemViewStore();


window.addEventListener("message", (evt: MessageEvent) => {
  const message: { command: string; value: any } = evt.data;
  switch (message.command) {
    case "initialLoad":
      setImmediate(() => {
        store.rawData = message.value;
        const eventNameLookupTable = eventNameMap(message.value.streams);

        const frag = fillEventTable(message.value, eventNameLookupTable);
        store.eventsTable = frag;

        const plotData = drawPlot(message.value);
        store.plotData = plotData;

        const stats = fillStatsTable(plotData);
        store.contextInfoTable = stats;
        store.isLoading = false;
      });
      break;
    default:
      // console.warn(`Message not understood, ${message}`);
      break;
  }
});