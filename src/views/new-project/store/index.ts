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
import { IExample, IExampleCategory } from "../../../examples/Example";

Vue.use(Vuex);

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export interface IdfBoard {
  name: string;
  description: string;
  target: string;
  configFiles: string;
}

export interface IdfTarget {
  id: string;
  name: string;
  openOcdFiles: string;
}

export interface IState {
  boards: IdfBoard[];
  components: IComponent[];
  containerDirectory: string;
  currentComponentPath: string;
  hasTemplateDetail: boolean;
  openOcdConfigFiles: string;
  projectName: string;
  selectedBoard: IdfBoard;
  selectedPort: string;
  selectedTemplate: IExample;
  serialPortList: string[];
  target: IdfTarget;
  targetList: IdfTarget[];
  templateDetail: string;
  templatesRootPath: IExampleCategory;
}

const newProjectState: IState = {
  boards: [],
  components: [],
  containerDirectory: "",
  currentComponentPath: "",
  hasTemplateDetail: false,
  openOcdConfigFiles: "",
  projectName: "project-name",
  selectedBoard: null,
  selectedPort: "",
  selectedTemplate: { name: "", path: "" },
  serialPortList: [],
  target: null,
  targetList: [],
  templateDetail: "",
  templatesRootPath: { name: "", examples: [], subcategories: [] },
};

export const mutations: MutationTree<IState> = {
  addComponent(state, newComponent) {
    const newState = state;
    newState.components.push(newComponent);
    state = { ...newState };
  },
  setBoards(state, boards: IdfBoard[]) {
    const newState = state;
    newState.boards = boards;
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
  setSelectedBoard(state, board: IdfBoard) {
    const newState = state;
    newState.selectedBoard = board;
    state = { ...newState };
  },
  setSelectedPort(state, port: string) {
    const newState = state;
    newState.selectedPort = port;
    state = { ...newState };
  },
  setSelectedTemplate(state, template: IExample) {
    const newState = state;
    newState.selectedTemplate = template;
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
  setTemplateDetail(state, templateDetail: string) {
    const newState = state;
    newState.templateDetail = templateDetail;
    newState.hasTemplateDetail = true;
    state = { ...newState };
  },
  setTemplates(state, templates: IExampleCategory) {
    const newState = state;
    newState.templatesRootPath = templates;
    state = { ...newState };
  },
  showTemplateDetail(state) {
    const newState = state;
    newState.hasTemplateDetail = !newState.hasTemplateDetail;
    Object.assign(state, newState);
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
      components: context.state.components,
      containerFolder: context.state.containerDirectory,
      openOcdConfigFiles: context.state.openOcdConfigFiles,
      port: context.state.selectedPort,
      projectName: context.state.projectName,
      target: context.state.target.id,
      template: context.state.selectedTemplate,
    });
  },
  getTemplateDetail(context, payload) {
    vscode.postMessage({
      command: "getTemplateDetail",
      path: payload.pathToOpen,
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
