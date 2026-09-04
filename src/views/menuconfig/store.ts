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
import { ref, Ref, computed } from "vue";
import { Menu } from "../../espIdf/menuconfig/Menu";
import { findMenuPath } from "../../espIdf/menuconfig/findMenuPath";

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
  const _selectedMenu = ref("");
  const searchString = ref("");
  const focusedConfigId = ref("");
  const textDictionary: Ref<{
    save: string;
    discard: string;
    reset: string;
  }> = ref({
    save: "Save",
    discard: "Discard",
    reset: "Reset",
  });

  const confserverVersion = ref(2);

  const selectedMenu = computed({
    get: () => _selectedMenu.value,
    set: (value: string) => {
      _selectedMenu.value = value;
    }
  });

  function sendNewValue(newValue: any) {
    if (newValue?.id && newValue.id === focusedConfigId.value) {
      clearFocusedConfig();
    }
    vscode.postMessage({
      command: "updateValue",
      updated_value: JSON.stringify(newValue),
    });
  }

  function saveGuiConfig() {
    clearFocusedConfig();
    vscode.postMessage({
      command: "saveChanges",
    });
  }

  function resetElement(id: string) {
    if (id === focusedConfigId.value) {
      clearFocusedConfig();
    }
    vscode.postMessage({
      command: "resetElement",
      id: id,
    });
  }

  function resetElementChildren(children: string[]) {
    if (focusedConfigId.value && children.includes(focusedConfigId.value)) {
      clearFocusedConfig();
    }
    vscode.postMessage({
      command: "resetElementChildren",
      children: children,
    });
  }

  function resetGuiConfig() {
    clearFocusedConfig();
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
    clearFocusedConfig();
    vscode.postMessage({
      command: "setDefault",
    });
  }

  function clearFocusedConfig() {
    focusedConfigId.value = "";
  }

  function focusConfig(id: string) {
    searchString.value = "";
    if (focusedConfigId.value === id) {
      focusedConfigId.value = "";
    }
    queueMicrotask(() => {
      focusedConfigId.value = id;
    });
  }

  function menuPathToId(id: string): Menu[] | undefined {
    return findMenuPath(items.value, id);
  }

  return {
    confserverVersion,
    items,
    searchString,
    focusedConfigId,
    selectedMenu,
    textDictionary,
    sendNewValue,
    setDefaultConfig,
    saveGuiConfig,
    resetElement,
    resetElementChildren,
    resetGuiConfig,
    requestInitValues,
    focusConfig,
    menuPathToId,
  };
});
