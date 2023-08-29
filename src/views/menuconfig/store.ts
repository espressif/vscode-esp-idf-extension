/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 25th August 2023 2:51:52 pm
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

import { defineStore } from "pinia";
import { ref, Ref } from "vue";
import { Menu } from "../../espIdf/menuconfig/Menu";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface State {
  items: Menu[];
  selectedMenu: string;
  searchString: string;
  textDictionary: {
    save: string;
    discard: string;
    reset: string;
  };
}

export const useMenuconfigStore = defineStore("menuconfig", () => {
  const items: Ref<Menu[]> = ref([]);
  const selectedMenu = ref("");
  const searchString = ref("");
  const textDictionary: Ref<{
    save: string;
    discard: string;
    reset: string;
  }> = ref({
    save: "Save",
    discard: "Discard",
    reset: "Reset",
  });

  function sendNewValue(newValue) {
    vscode.postMessage({
      command: "updateValue",
      updated_value: newValue,
    });
  }

  function saveGuiConfig() {
    // Save current items
    vscode.postMessage({
      command: "saveChanges",
    });
  }

  function resetGuiConfig() {
    // Reset current items
    vscode.postMessage({
      command: "discardChanges",
    });
  }

  function requestInitValues() {
    vscode.postMessage({
      command: "requestInitValues",
    });
  }

  function setDefaultConfig() {
    // Set default items
    vscode.postMessage({
      command: "setDefault",
    });
  }

  return {
    items,
    searchString,
    selectedMenu,
    textDictionary,
    sendNewValue,
    setDefaultConfig,
    saveGuiConfig,
    resetGuiConfig,
    requestInitValues,
  };
});
