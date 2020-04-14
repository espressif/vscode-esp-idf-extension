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
import { ActionTree, MutationTree, StoreOptions } from "vuex";
import { IPath, ITool } from "../../../ITool";
import { IExample } from "../../../examples/Examples";
import { State } from "vuex-class";
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";

export interface State {
  components: IComponent[];
  currentComponentPath: string;
  idfPathVersion: string;
  idfVersions: IPath[];
  isValid: boolean;
  pyVenvList: IPath[];
  selectedIdfVersion: IPath;
  selectedVenv: IPath;
  selectedTemplateCategory: string;
  selectedTemplate: IExample;
  templates: IExample[];
  toolsInMetadata: ITool[];
}

declare let acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.log(error);
}

export const projectState: State = {
  components: [],
  currentComponentPath: "",
  idfPathVersion: "",
  idfVersions: [],
  isValid: false,
  pyVenvList: [],
  selectedVenv: { id: "", path: "" },
  selectedIdfVersion: { id: "", path: "" },
  selectedTemplate: { name: "", category: "", path: "" },
  selectedTemplateCategory: "",
  templates: [{ name: "", category: "", path: "" }],
  toolsInMetadata: [],
};

export const actions: ActionTree<State, any> = {
  createProject(context) {
    vscode.postMessage({
      command: "createProject",
      components: context.state.components,
      idf: context.state.selectedIdfVersion,
      template: context.state.selectedTemplate,
      tools: context.state.toolsInMetadata,
      venv: context.state.selectedVenv,
    });
  },
  checkIsValid(context) {
    vscode.postMessage({
      command: "checkIsValid",
      idf: context.state.selectedIdfVersion,
      tools: context.state.toolsInMetadata,
      venv: context.state.selectedVenv,
    });
  },
  getIdfVersion(context, newIdfPath) {
    vscode.postMessage({
      command: "getIdfVersion",
      idf_path: newIdfPath,
    });
  },
  loadExamples(context) {
    vscode.postMessage({
      command: "loadExamples",
      idf_path: context.state.selectedIdfVersion.path,
    });
  },
  openComponentFolder() {
    vscode.postMessage({
      command: "loadComponent",
    });
  },
  requestInitValues() {
    vscode.postMessage({
      command: "requestInitValues",
    });
  },
};

export const mutations: MutationTree<State> = {
  addComponent(state, newComponent) {
    const newState = state;
    newState.components.push(newComponent);
    state = { ...newState };
  },
  setCurrentComponentPath(state, currentComponentPath) {
    const newState = state;
    newState.currentComponentPath = currentComponentPath;
    state = { ...newState };
  },
  setIsValid(state, isValid) {
    const newState = state;
    newState.isValid = isValid;
    state = { ...newState };
  },
  setIdfPathVersion(state, currentIdfVersion: string) {
    const newState = state;
    newState.idfPathVersion = currentIdfVersion;
    state = { ...newState };
  },
  setIdfVersions(state, idfVersions: IPath[]) {
    const newState = state;
    newState.idfVersions = idfVersions;
    state = { ...newState };
  },
  setPyEnvList(state, pyVenvList: IPath[]) {
    const newState = state;
    newState.pyVenvList = pyVenvList;
    state = { ...newState };
  },
  setSelectedIdf(state, selectedIdf: IPath) {
    const newState = state;
    newState.selectedIdfVersion = selectedIdf;
    state = { ...newState };
  },
  setSelectedVenv(state, selectedVenv: IPath) {
    const newState = state;
    newState.selectedVenv = selectedVenv;
    state = { ...newState };
  },
  setTemplates(state, examples: IExample[]) {
    const newState = state;
    newState.templates = examples;
    newState.selectedTemplateCategory = examples[0].category;
    newState.selectedTemplate = examples[0];
    state = { ...newState };
  },
  setSelectedCategory(state, category: string) {
    const newState = state;
    newState.selectedTemplateCategory = category;
    state = { ...newState };
  },
  setSelectedTemplate(state, template: IExample) {
    const newState = state;
    newState.selectedTemplate = template;
    state = { ...newState };
  },
  setToolsList(state, toolList: ITool[]) {
    const newState = state;
    newState.toolsInMetadata = toolList;
    state = { ...newState };
  },
  removeComponent(state, component: IComponent) {
    const newState = state;
    const index = newState.components.indexOf(component);
    newState.components.splice(index, 1);
    state = { ...newState };
  },
};

export const project: StoreOptions<State> = {
  actions,
  mutations,
  state: projectState,
};
