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
import { ProjectConfElement } from "../../../project-conf/projectConfiguration";

Vue.use(Vuex);

export interface IState {
  elements: { [key: string]: ProjectConfElement };
  emptyElement: ProjectConfElement;
  textDictionary: {
    add: string;
    save: string;
    discard: string;
    title: string;
  };
}

export const projectConfigState: IState = {
  elements: Object.create(null),
  emptyElement: {
    build: {
      compileArgs: [],
      ninjaArgs: [],
      buildDirectoryPath: "",
      sdkconfigDefaults: [],
      sdkconfigFilePath: ""
    },
    env: {},
    flashBaudRate: "",
    idfTarget: "",
    monitorBaudRate: "",
    openOCD: {
      debugLevel: 0,
      configs: [],
      args: [],
    },
    tasks: {
      preBuild: "",
      preFlash: "",
      postBuild: "",
      postFlash: "",
    },
  },
  textDictionary: {
    add: "Add",
    discard: "Discard",
    save: "Save",
    title: "Project Configuration",
  },
};

declare var acquireVsCodeApi: any;
let vscode: any;

try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export const actions: ActionTree<IState, any> = {
  requestInitValues(context) {
    vscode.postMessage({ command: "requestInitialValues" });
  },
  saveChanges(context) {
    vscode.postMessage({
      command: "saveProjectConfFile",
      confDict: context.state.elements,
    });
  },
  openBuildPath(context, payload: { confKey: string; sections: string[] }) {
    vscode.postMessage({
      command: "openBuildPath",
      sectionsKeys: payload.sections,
      confKey: payload.confKey,
    });
  },
};

export const mutations: MutationTree<IState> = {
  loadTextDictionary(state, textDictionary) {
    const newState = state;
    newState.textDictionary = textDictionary;
    state = { ...newState };
  },
  setConfigList(state, confList) {
    const newState = state;
    newState.elements = confList;
    state = { ...newState };
  },
  addNewConfigToList(state, confKey: string) {
    let newConf = {
      build: {
        compileArgs: [],
        ninjaArgs: [],
        buildDirectoryPath: "",
        sdkconfigDefaults: [],
        sdkconfigFilePath: ""
      },
      env: {},
      flashBaudRate: "",
      idfTarget: "",
      monitorBaudRate: "",
      openOCD: {
        debugLevel: 0,
        configs: [],
        args: [],
      },
      tasks: {
        preBuild: "",
        preFlash: "",
        postBuild: "",
        postFlash: "",
      },
    } as ProjectConfElement;
    Vue.set(state.elements, confKey, newConf);
  },
  updateConfigElement(
    state,
    payload: { confKey: string; sections: string[]; newValue: any }
  ) {
    const newState = state;
    if (payload.sections && payload.sections.length === 1) {
      newState.elements[payload.confKey][payload.sections[0]] =
        payload.newValue;
    } else if (
      payload.sections &&
      payload.sections.length === 2 &&
      Object.keys(newState.elements[payload.confKey]).indexOf(
        payload.sections[0]
      ) !== -1
    ) {
      newState.elements[payload.confKey][payload.sections[0]][
        payload.sections[1]
      ] = payload.newValue;
    }
    state = { ...newState };
  },
  addValueToConfigElement(
    state,
    payload: { confKey: string; sections: string[]; valueToAdd: any }
  ) {
    if (payload.sections && payload.sections.length === 1) {
      state.elements[payload.confKey][payload.sections[0]].push(
        payload.valueToAdd
      );
    } else if (
      payload.sections &&
      payload.sections.length === 2 &&
      Object.keys(state.elements[payload.confKey]).indexOf(
        payload.sections[0]
      ) !== -1
    ) {
      state.elements[payload.confKey][payload.sections[0]][
        payload.sections[1]
      ].push(payload.valueToAdd);
    }
  },
  removeValueFromConfigElement(
    state,
    payload: { confKey: string; sections: string[]; index: number }
  ) {
    if (payload.sections && payload.sections.length === 1) {
      state.elements[payload.confKey][payload.sections[0]].splice(
        payload.index,
        1
      );
    } else if (
      payload.sections &&
      payload.sections.length === 2 &&
      Object.keys(state.elements[payload.confKey]).indexOf(
        payload.sections[0]
      ) !== -1
    ) {
      state.elements[payload.confKey][payload.sections[0]][
        payload.sections[1]
      ].splice(payload.index, 1);
    }
  },
};

export const options: StoreOptions<IState> = {
  actions,
  mutations,
  state: projectConfigState,
};

export const store = new Vuex.Store(options);
