/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 14th October 2020 11:30:02 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Vue from "vue";
import Vuex, { ActionTree, MutationTree, StoreOptions } from "vuex";

Vue.use(Vuex);

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export interface Targets {
  id: String;
  name: String;
}

export interface OpenOCDBoardOptions {
  name: String;
  value: String;
  description: String;
  type: String;
}

export interface OpenOCDBoard {
  name: String;
  description: String;
  target: String;
  config_files: Array<String>;
}

export interface OpenOCDBoardConfig {
  targets: Array<Targets>;
  boards: Array<OpenOCDBoard>;
  options: Array<OpenOCDBoardOptions>;
}
export interface OpenOCDBoardSelectorState {
  boards: Array<OpenOCDBoard>;
}

export const state: OpenOCDBoardSelectorState = {
  boards: [
    {
      name: "ESP-WROVER-KIT 3.3V",
      description: "ESP-WROVER-KIT with 3.3V ESP32-WROVER-B module",
      target: "esp32",
      config_files: ["boards/esp32-wrover-kit-3.3v.cfg"],
    },
    {
      name: "ESP-WROVER-KIT 1.8V",
      description: "ESP-WROVER-KIT with 1.8V ESP32-WROVER-B module",
      target: "esp32",
      config_files: ["boards/esp32-wrover-kit-1.8v.cfg"],
    },
    {
      name: "ESP32-ETHERNET-KIT",
      description: "ESP32-ETHERNET-KIT with ESP32-WROVER-E module",
      target: "esp32",
      config_files: ["board/esp32-ethernet-kit-3.3v.cfg"],
    },
    {
      name: "ESP32 module",
      description: "ESP32 used with ESP-PROG board",
      target: "esp32",
      config_files: ["interface/ftdi/esp32_devkitjv1.cfg", "target/esp32.cfg"],
    },
    {
      name: "ESP32-SOLO-1 module",
      description: "ESP32-SOLO-1 used with ESP-PROG board",
      target: "esp32",
      config_files: [
        "interface/ftdi/esp32_devkitjv1.cfg",
        "target/esp32-solo-1.cfg",
      ],
    },
    {
      name: "ESP32-S2-KALUGA-1",
      description: "ESP32-S2-KALUGA-1 kit",
      target: "esp32s2",
      config_files: ["board/esp32s2-kaluga-1.cfg"],
    },
    {
      name: "ESP32-S2 module",
      description: "ESP32-S2 used with ESP-PROG board",
      target: "esp32s2",
      config_files: [
        "interface/ftdi/esp32_devkitjv1.cfg",
        "target/esp32s2.cfg",
      ],
    },
  ],
};

export const mutations: MutationTree<OpenOCDBoardSelectorState> = {};

export const actions: ActionTree<OpenOCDBoardSelectorState, any> = {};

export const store: StoreOptions<OpenOCDBoardSelectorState> = {
  state,
  mutations,
  actions,
};

export default new Vuex.Store(store);
