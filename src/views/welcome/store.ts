/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th November 2021 3:11:24 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { ActionTree, Store, StoreOptions, MutationTree } from "vuex";

export interface IState {
  espIdf: string;
  extensionVersion: string;
}

export const welcomeState: IState = {
  espIdf: "",
  extensionVersion: "",
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
  requestInitValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  },
};

export const mutations: MutationTree<IState> = {
  setEspIdf(state, espIdf) {
    const newState = state;
    newState.espIdf = espIdf;
    Object.assign(state, newState);
  },
  setExtensionVersion(state, extensionVersion) {
    const newState = state;
    newState.extensionVersion = extensionVersion;
    Object.assign(state, newState);
  },
};

export const welcomeStore: StoreOptions<IState> = {
  actions,
  mutations,
  state: welcomeState,
};

Vue.use(Vuex);

export const store = new Store(welcomeStore);
