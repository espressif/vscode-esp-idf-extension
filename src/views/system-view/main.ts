// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Vue from "vue";
import App from "./App.vue";
import { store } from "./store";

new Vue({
  el: "#app",
  components: { App },
  store,
  template: "<App />",
});

import { fillEventTable } from "./table";
import { drawPlot } from "./plot";
import { eventNameMap, resize } from "./util";
import { fillStatsTable } from "./stats";

window.addEventListener("message", (evt: MessageEvent) => {
  const message: { command: string; value: any } = evt.data;
  switch (message.command) {
    case "initialLoad":
      setImmediate(() => {
        store.commit("setSVDATJSON", message.value);
        const eventNameLookupTable = eventNameMap(message.value.streams);

        const frag = fillEventTable(message.value, eventNameLookupTable);
        store.commit("setEventsTable", frag);

        const plotData = drawPlot(message.value);
        store.commit("setPlotData", plotData);

        const stats = fillStatsTable(plotData);
        store.commit("setContextInfoTable", stats);

        store.commit("setLoading", false);
      });
      break;
    default:
      // console.warn(`Message not understood, ${message}`);
      break;
  }
});
