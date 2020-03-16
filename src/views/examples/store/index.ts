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
import Vuex, { ActionTree, MutationTree, StoreOptions } from "vuex";

Vue.use(Vuex);

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface IExample {
  path: string;
  category: string;
  name: string;
}

export interface IState {
  examplesPaths: string[];
  selectedExample: IExample;
  hasExampleDetail: boolean;
  exampleDetail: string;
}

export const examplesState: IState = {
  examplesPaths: [],
  selectedExample: { path: "", category: "", name: "" },
  hasExampleDetail: false,
  exampleDetail: ""
};

export const mutations: MutationTree<IState> = {
  setExampleDetail(state, exampleDetail) {
    const newState = state;
    newState.exampleDetail = exampleDetail;
    newState.hasExampleDetail = true;
    Object.assign(state, newState);
  },
  setExamplesPath(state, exampleList) {
    const newState = state;
    newState.examplesPaths = exampleList;
    Object.assign(state, newState);
  },
  setSelectedExample(state, selectedExample: IExample) {
    const newState = state;
    newState.selectedExample = selectedExample;
    Object.assign(state, newState);
  },
  showExampleDetail(state) {
    const newState = state;
    newState.hasExampleDetail = !newState.hasExampleDetail;
    Object.assign(state, newState);
  }
};

export const actions: ActionTree<IState, any> = {
  getExamplesList() {
    vscode.postMessage({ command: "getExamplesList" });
  },
  openExample(context, payload) {
    vscode.postMessage({
      command: "openExampleProject",
      project_path: payload.pathToOpen,
      name: payload.name
    });
  },
  getExampleDetail(context, payload) {
    vscode.postMessage({
      command: "getExampleDetail",
      path: payload.pathToOpen
    });
  }
};

export const examples: StoreOptions<IState> = {
  state: examplesState,
  mutations,
  actions
};

export const store = new Vuex.Store(examples);
