/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th September 2023 7:16:55 pm
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
import {createPinia } from "pinia";
import App from "./App.vue";
import Calls from "./components/Calls.vue";
import CallStack from "./components/CallStack.vue";
import LeakList from "./components/LeakList.vue";
import Plot from "./components/Plot.vue";
import QuickActionMenu from "./components/QuickActionMenu.vue";
import QuickCallStack from "./components/QuickCallStack.vue";
import Tree from "./components/Tree.vue";
import Stats from "./components/Stats.vue";
import { useTracingStore } from "./store";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.component("stack-trace", Tree);
app.component("call-stack", CallStack);
app.component("calls", Calls);
app.component("plot", Plot);
app.component("quick-call-stack", QuickCallStack);
app.component("quick-action-menu", QuickActionMenu);
app.component("leak-list", LeakList);
app.component("stats-view", Stats);

const store = useTracingStore();

// Message Receiver
window.addEventListener("message", (m: any) => {
  const msg = m.data;
  switch (msg.command) {
    case "initialLoad":
      store.updateModelWithTraceData(msg.value);
      break;
    case "calculated":
      store.showLog(msg.value);
      break;
    case "calculatedHeapTrace":
      store.plotData(msg.value);
      break;
    case "calculateFailed":
      store.calculateFailed(msg.value);
      break;
    case "addressesResolved":
      store.populateGlobalCallStackCountAndSize(msg.value);
      break;
    default:
      break;
  }
});