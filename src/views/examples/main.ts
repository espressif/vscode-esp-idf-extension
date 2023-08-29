/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 25th August 2023 2:09:54 pm
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
import Examples from "./Examples.vue";
import { useExamplesStore } from "./store";

const app = createApp(Examples);
const pinia = createPinia();

app.use(pinia);
app.mount("#examples");

const store = useExamplesStore();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "set_examples_path":
      if (message.example_list) {
        store.exampleRootPath = message.example_list;
      }
      break;
    case "set_example_detail":
      if (message.example_detail) {
        store.exampleDetail = message.example_detail;
      }
      break;
    case "set_initial_example":
      if (message.selected_example) {
        store.selectedExample = message.selected_example;
        store.getExampleDetail({
          pathToOpen: message.selected_example.path,
        });
      }
      break;
    default:
      break;
  }
});