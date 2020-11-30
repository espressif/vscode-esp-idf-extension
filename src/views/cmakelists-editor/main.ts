// Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
// @ts-ignore
import CMakeListsEditor from "./CmakeListsEditor.vue";
import { store } from "./store";
import IconifyIcon from "@iconify/vue";
import add from "@iconify-icons/codicon/add";
import close from "@iconify-icons/codicon/close";
IconifyIcon.addIcon("add", add);
IconifyIcon.addIcon("close", close);
Vue.component("iconify-icon", IconifyIcon);

// tslint:disable-next-line: no-unused-expression
const app = new Vue({
  el: "#editor",
  components: { CMakeListsEditor },
  store,
  template: "<CMakeListsEditor />",
});

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "command":
      if (message.value) {
        store.commit("command", message.value);
      }
      break;
    case "loadElements":
      if (message.elements) {
        store.commit("loadCmakeListsElements", message.elements);
      }
      break;
    case "setFileName":
      if (message.fileName) {
        store.commit("setFileName", message.fileName);
      }
      break;
    default:
      break;
  }
});
