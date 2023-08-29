/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 25th August 2023 2:51:30 pm
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
import { addIcon } from "@iconify/vue";
import info from "@iconify-icons/codicon/info";
import chevronRight from "@iconify-icons/codicon/chevron-right";
import chevronDown from "@iconify-icons/codicon/chevron-down";
import { useMenuconfigStore } from "./store";
import Menuconfig from "./Menuconfig.vue";
addIcon("info", info);
addIcon("chevron-right", chevronRight);
addIcon("chevron-down", chevronDown);

const app = createApp(Menuconfig);
const pinia = createPinia();

app.use(pinia);
app.mount("#menuconfig");

const store = useMenuconfigStore();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "load_initial_values":
      if (message.menus) {
        store.items = message.menus;
      }
      break;
    case "update_values":
      if (message.updated_values) {
        store.items = message.updated_values;
      }
      break;
    case "load_dictionary":
      if (message.text_dictionary) {
        store.textDictionary = message.text_dictionary;
      }
      break;
    default:
      break;
  }
});