/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 9th September 2020 1:08:35 pm
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

export namespace PartitionTable {
  export interface Row {
    name: String;
    type: String;
    subtype: String;
    offset: String;
    size: String;
    flag: String;
  }
  export interface State {
    path: String;
    rows: Array<Row>;
    dirty: Boolean;
  }
}

export const state: PartitionTable.State = {
  path: "",
  rows: [],
  dirty: false,
};

export const mutations: MutationTree<PartitionTable.State> = {
  ADD(state, row) {
    state.dirty = true;
    state.rows.push(row);
  },
  DELETE(state, index) {
    state.dirty = true;
    state.rows.splice(index, 1);
  },
  CLEAN(state) {
    state.dirty = false;
  },
};

export const actions: ActionTree<PartitionTable.State, any> = {
  addRow(ctx, row) {
    this.commit("ADD", row);
  },
  deleteRow(ctx, index) {
    this.commit("DELETE", index);
  },
  save() {
    this.commit("CLEAN");
    console.log(this.state.rows);
  },
  openExample(context, payload) {
    vscode.postMessage({
      command: "openExampleProject",
      project_path: payload.pathToOpen,
      name: payload.name,
    });
  },
};

export const examples: StoreOptions<PartitionTable.State> = {
  state,
  mutations,
  actions,
};

export default new Vuex.Store(examples);
