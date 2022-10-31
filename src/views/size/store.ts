/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th October 2021 2:35:26 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { ActionTree, MutationTree, Store, StoreOptions } from "vuex";
import Vuex from "vuex";

export interface IState {
  archives: {};
  isFlashing: boolean;
  isOverviewEnabled: boolean;
  overviewData: {};
  searchText: string;
}

export const sizeState: IState = {
  archives: {},
  isFlashing: false,
  isOverviewEnabled: true,
  overviewData: {},
  searchText: "",
};

const SEC = 1000;
declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export const actions: ActionTree<IState, any> = {
  retryClicked() {
    if (vscode) {
      vscode.postMessage({
        command: "retry",
      });
    }
  },
  flashClicked(context) {
    if (vscode) {
      context.state.isFlashing = true;
      setTimeout(() => {
        context.state.isFlashing = false;
      }, 10 * SEC);
      vscode.postMessage({
        command: "flash",
      });
    }
  },
  requestInitialValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  },
};

export const mutations: MutationTree<IState> = {
  setArchive(state, archive) {
    const newState = state;
    newState.archives = archive;
    Object.assign(state, newState);
  },
  setFiles(state, files) {
    const newState = state;
    Object.keys(files).forEach((file) => {
      const archiveFileName = file.split(":");
      const archiveName = archiveFileName[0];
      const fileName = archiveFileName[1];
      if (
        newState.archives[archiveName] &&
        !newState.archives[archiveName].files
      ) {
        Vue.set(newState.archives[archiveName], "files", {});
      }
      Vue.set(newState.archives[archiveName].files, fileName, files[file]);
    });
    Object.keys(newState.archives).forEach((archive) => {
      Vue.set(newState.archives[archive], "isFileInfoVisible", false);
    });
    Object.assign(state, newState);
  },
  setOverviewData(state, overview) {
    const newState = state;
    newState.overviewData = overview;
    Object.assign(state, newState);
  },
  setSearchText(state, text: string) {
    const newState = state;
    newState.searchText = text;
    Object.assign(state, newState);
  },
  toggleOverviewAndDetails(state) {
    const newState = state;
    newState.isOverviewEnabled = !state.isOverviewEnabled;
    Object.assign(state, newState);
  },
  toggleArchiveFileInfoTable(state, archiveName: string) {
    const newState = state;
    Object.keys(newState.archives).forEach((archive) => {
      let toggleVisibility = false;
      if (archive === archiveName) {
        toggleVisibility = !this.archives[archive].isFileInfoVisible;
      }
      Vue.set(
        newState.archives[archive],
        "isFileInfoVisible",
        toggleVisibility
      );
    });
  },
};

export const sizeStore: StoreOptions<IState> = {
  actions,
  mutations,
  state: sizeState,
};

Vue.use(Vuex);

export const store = new Store(sizeStore);
