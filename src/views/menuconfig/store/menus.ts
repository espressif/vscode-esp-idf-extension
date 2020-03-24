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
import { ActionTree, MutationTree, StoreOptions } from "vuex";
import { Menu } from "../../../espIdf/menuconfig/Menu";

// tslint:disable-next-line: interface-name
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

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const menuState: State = {
  items: [],
  selectedMenu: "",
  searchString: "",
  textDictionary: {
    save: "Save",
    discard: "Discard",
    reset: "Reset",
  },
};

export const actions: ActionTree<State, any> = {
  sendNewValue(context, newValue) {
    vscode.postMessage({
      command: "updateValue",
      updated_value: newValue,
    });
  },
  saveGuiConfig() {
    // Save current items
    vscode.postMessage({
      command: "saveChanges",
    });
  },
  resetGuiConfig() {
    // Reset current items
    vscode.postMessage({
      command: "discardChanges",
    });
  },
  requestInitValues() {
    vscode.postMessage({
      command: "requestInitValues",
    });
  },
  setDefaultConfig() {
    // Set default items
    vscode.postMessage({
      command: "setDefault",
    });
  },
};

export const mutations: MutationTree<State> = {
  loadTextDictionary(state, textDictionary) {
    const newState = state;
    newState.textDictionary = textDictionary;
    state = { ...newState };
  },
  setSelectedMenu(state, newSelectedMenu) {
    const newState = state;
    newState.selectedMenu = newSelectedMenu;
    state = { ...newState };
  },
  setSearchString(state, searchString) {
    const newState = state;
    newState.searchString = searchString;
    state = { ...newState };
  },
  setInitialValues(state, initialValues) {
    const newState = state;
    newState.items = initialValues;
    state = { ...newState };
  },
  updateValues(state, updatedValues) {
    Vue.set(state, "items", updatedValues);
  },
};

export const menus: StoreOptions<State> = {
  actions,
  mutations,
  state: menuState,
};
