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
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";
import { IExample } from "../../../examples/Example";

Vue.use(Vuex);

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export interface IdfTarget {
  id: string;
  name: string;
  openOcdFiles: string;
}

export interface IState {
  components: IComponent[];
  containerDirectory: string;
  currentComponentPath: string;
  openOcdConfigFiles: string;
  projectName: string;
  selectedPort: string;
  selectedTemplate: string;
  serialPortList: string[];
  target: IdfTarget;
  targetList: IdfTarget[];
  templates: IExample[];
}

const newProjectState: IState = {
  components: [],
  containerDirectory: "",
  currentComponentPath: "",
  openOcdConfigFiles: "",
  projectName: "project-name",
  selectedPort: "",
  selectedTemplate: "",
  serialPortList: [],
  target: null,
  targetList: [],
  templates: [],
};

export const mutations: MutationTree<IState> = {
  addComponent(state, newComponent) {
    const newState = state;
    newState.components.push(newComponent);
    state = { ...newState };
  },
  setContainerDirectory(state, containerDir: string) {
    const newState = state;
    newState.containerDirectory = containerDir;
    state = { ...newState };
  },
  setCurrentComponentPath(state, componentPath: string) {
    const newState = state;
    newState.currentComponentPath = componentPath;
    state = { ...newState };
  },
  setOpenOcdConfigFiles(state, openOcdConfigFiles: string) {
    const newState = state;
    newState.openOcdConfigFiles = openOcdConfigFiles;
    state = { ...newState };
  },
  setProjectName(state, projectName: string) {
    const newState = state;
    newState.projectName = projectName;
    state = { ...newState };
  },
  setSelectedPort(state, port: string) {
    const newState = state;
    newState.selectedPort = port;
    state = { ...newState };
  },
  setSelectedTemplate(state, port: string) {
    const newState = state;
    newState.selectedPort = port;
    state = { ...newState };
  },
  setSerialPortList(state, serialPortList: string[]) {
    const newState = state;
    newState.serialPortList = serialPortList;
    state = { ...newState };
  },
  setTarget(state, target: IdfTarget) {
    const newState = state;
    console.log(target);
    state.target = target;
    state = { ...newState };
  },
  setTargetList(state, targetList: IdfTarget[]) {
    const newState = state;
    newState.targetList = targetList;
    state = { ...newState };
  },
  setTemplates(state, templates: IExample[]) {
    const newState = state;
    newState.templates = templates;
    state = { ...newState };
  },
  removeComponent(state, component: IComponent) {
    const newState = state;
    const index = newState.components.indexOf(component);
    newState.components.splice(index, 1);
    state = { ...newState };
  },
};

export const actions: ActionTree<IState, any> = {
  createProject(context) {
    vscode.postMessage({
      command: "createProject",
      containerFolder: context.state.containerDirectory,
      openOcdConfigFiles: context.state.openOcdConfigFiles,
      port: context.state.selectedPort,
      projectName: context.state.projectName,
      target: context.state.target,
      template: context.state.selectedTemplate,
    });
  },
  openComponentFolder() {
    vscode.postMessage({
      command: "loadComponent",
    });
  },
  openProjectDirectory() {
    vscode.postMessage({
      command: "openProjectDirectory",
    });
  },
  requestInitialValues() {
    vscode.postMessage({
      command: "requestInitValues",
    });
  },
};

export const newProjectStoreOptions: StoreOptions<IState> = {
  actions,
  mutations,
  state: newProjectState,
};

export const store = new Vuex.Store(newProjectStoreOptions);
