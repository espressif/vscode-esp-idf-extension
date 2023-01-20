/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 6th January 2023 3:56:21 pm
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

import Vue from "vue";
import Vuex from "vuex";
import { ActionTree, MutationTree, StoreOptions } from "vuex";

Vue.use(Vuex);

export interface IState {
  elements: {}[];
  emptyElements: {}[];
  selectedElement: {};
  textDictionary: {
    add: string;
    save: string;
    discard: string;
    title: string;
  }
}

export const projectConfigState : IState = {
  elements: [],
  emptyElements: [],
  selectedElement: {},
  textDictionary: {
    add: "Add",
    discard: "Discard",
    save: "Save",
    title: "Project Configuration"
  }
}

declare var acquireVsCodeApi: any;
let vscode: any;

try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export const actions: ActionTree<IState, any> = {
  requestInitValues(context) {
    vscode.postMessage({ command: "load" })
  }
};

export const mutations: MutationTree<IState> = {
  loadTextDictionary(state, textDictionary) {
    const newState = state;
    newState.textDictionary = textDictionary;
    state = { ...newState };
  }
}

export const options: StoreOptions<IState> = {
  actions,
  mutations,
  state: projectConfigState
};

export const store = new Vuex.Store(options);