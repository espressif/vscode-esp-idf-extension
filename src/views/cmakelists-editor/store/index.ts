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
import Vuex from "vuex";
import { ActionTree, MutationTree, StoreOptions } from "vuex";
import { CmakeListsElement } from "../../../cmake/CmakeListsElement";
Vue.use(Vuex);

// tslint:disable-next-line: interface-name
export interface IState {
  elements: CmakeListsElement[];
  textDictionary: {
    save: string;
    discard: string;
    title: string;
  };
}

export const CMakeListEditorState: IState = {
  elements: [],
  textDictionary: {
    discard: "Discard",
    save: "Save",
    title: "CMakeLists.txt Editor",
  },
};

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const actions: ActionTree<IState, any> = {
  sendNewValue(context, newValue) {
    vscode.postMessage({
      command: "updateValue",
      updated_value: newValue,
    });
  },
  saveChanges(context) {
    vscode.postMessage({
      command: "saveChanges",
      newValues: context.state.elements,
    });
  },
  requestInitValues(context) {
    vscode.postMessage({ command: "loadCMakeListSchema" });
  },
};

export const mutations: MutationTree<IState> = {
  loadTextDictionary(state, textDictionary) {
    const newState = state;
    newState.textDictionary = textDictionary;
    state = { ...newState };
  },
  loadCmakeListsElements(state, elements) {
    const newState = state;
    newState.elements = elements;
    state = { ...newState };
  },
};

export const cmakelists: StoreOptions<IState> = {
  actions,
  mutations,
  state: CMakeListEditorState,
};

export const store = new Vuex.Store(cmakelists);
