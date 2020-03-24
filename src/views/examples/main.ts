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
import Examples from "./Examples.vue";
import { store } from "./store";

// tslint:disable-next-line: no-unused-expression
new Vue({
  el: "#examples",
  components: { Examples },
  store,
  data: {
    versions: [],
  },
  template: "<Examples />",
});

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "set_examples_path":
      if (message.example_list) {
        store.commit("setExamplesPath", message.example_list);
      }
      break;
    case "set_example_detail":
      if (message.example_detail) {
        store.commit("setExampleDetail", message.example_detail);
      }
      break;
    case "set_initial_example":
      if (message.selected_example) {
        store.commit("setSelectedExample", message.selected_example);
        store.dispatch("getExampleDetail", {
          pathToOpen: message.selected_example.path,
        });
      }
      break;
    default:
      break;
  }
});
