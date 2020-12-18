/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 15th December 2020 7:23:12 pm
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

export namespace NvsPartitionTable {
  export interface IRow {
    key: string;
    type: string;
    encoding: string;
    value: string;
    error: string;
  }
  export interface State {
    dirty: Boolean;
    encrypt: Boolean;
    encryptKeyPath: string;
    generateKey: Boolean;
    partitionSize: string;
    rows: Array<IRow>;
  }
}

export const state: NvsPartitionTable.State = {
  dirty: false,
  encrypt: false,
  encryptKeyPath: "",
  generateKey: true,
  partitionSize: "",
  rows: [{ key: "", type: "", encoding: "", value: "", error: "" }],
};

export const mutations: MutationTree<NvsPartitionTable.State> = {
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
  SET_ROWS(state, rows) {
    state.rows = rows;
  },
  SET_ERROR_FOR_ROW(state, { row, error }) {
    Vue.set(state.rows[row], "error", error);
  },
  CLEAR_ALL_ROW_ERRORS(state) {
    state.rows.forEach((row) => Vue.set(row, "error", undefined));
  },
  setEncrypt(state, useEncryption: Boolean) {
    state.encrypt = useEncryption;
  },
  setEncryptKeyPath(state, encryptKeyPath: string) {
    state.encryptKeyPath = encryptKeyPath;
  },
  setGenerateKey(state, generateKey: Boolean) {
    state.generateKey = generateKey;
  },
  setPartitionSize(state, partitionSize: string) {
    state.partitionSize = partitionSize;
  },
};

export const actions: ActionTree<NvsPartitionTable.State, any> = {
  genPartition(context) {
    vscode.postMessage({
      command: "genNvsPartition",
      encrypt: context.state.encrypt,
      encryptKeyPath: context.state.encryptKeyPath,
      generateKey: context.state.generateKey,
      partitionSize: context.state.partitionSize,
    });
  },
  initDataRequest(context) {
    vscode.postMessage({
      command: "getInitialData",
    });
  },
  openKeyFile() {
    vscode.postMessage({
      command: "openKeyFile",
    });
  },
  save(context) {
    context.commit("CLEAR_ALL_ROW_ERRORS");
    /* const { row, error, ok } = isValidJSON(ctx.state.rows);
    if (!ok) {
      ctx.commit("SET_ERROR_FOR_ROW", { row, error });
      console.log(error, row);
      vscode.postMessage({
        command: "showErrorMessage",
        error,
      });
      return;
    }
    const csv = JSON2CSV(ctx.state.rows);
    console.log(csv);
    ctx.commit("CLEAN");
    vscode.postMessage({
      command: "saveDataRequest",
      csv,
    }); */
  },
};

export const nvsPartTableEditorStoreOptions: StoreOptions<NvsPartitionTable.State> = {
  state,
  mutations,
  actions,
};

export default new Vuex.Store(nvsPartTableEditorStoreOptions);
