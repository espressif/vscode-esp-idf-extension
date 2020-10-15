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

export interface OpenOCDBoardSelectorState {}

export const state: OpenOCDBoardSelectorState = {};

export const mutations: MutationTree<OpenOCDBoardSelectorState> = {};

export const actions: ActionTree<OpenOCDBoardSelectorState, any> = {};

export const store: StoreOptions<OpenOCDBoardSelectorState> = {
  state,
  mutations,
  actions,
};

export default new Vuex.Store(store);
