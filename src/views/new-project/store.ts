/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 28th August 2023 5:18:06 pm
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
import { defineStore } from "pinia";
import { IComponent } from "../../espIdf/idfComponent/IdfComponent";
import { IExample, IExampleCategory } from "../../examples/Example";
import { IdfBoard } from "../../espIdf/openOcd/boardConfiguration";
import { Ref, ref } from "vue";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export const useNewProjectStore = defineStore("newProject", () => {
  const boards: Ref<IdfBoard[]> = ref([]);
  const components: Ref<IComponent[]> = ref([]);
  const containerDirectory: Ref<string> = ref("");
  const currentComponentPath: Ref<string> = ref("");
  const hasTemplateDetail: Ref<boolean> = ref(false);
  const openOcdConfigFiles: Ref<string> = ref("");
  const projectName: Ref<string> = ref("");
  const selectedBoard: Ref<IdfBoard> = ref({
    name: "",
    description: "",
    target: "",
    configFiles: [],
  });
  const selectedFramework: Ref<string> = ref("");
  const selectedPort: Ref<string> = ref("");
  const selectedTemplate: Ref<IExample> = ref({ name: "", path: "" });
  const serialPortList: Ref<string[]> = ref([]);
  const target: Ref<IdfBoard> = ref({
    name: "",
    description: "",
    target: "",
    configFiles: [],
  });
  const targetList: Ref<IdfBoard[]> = ref([]);
  const templateDetail: Ref<string> = ref("");
  const templatesRootPath: Ref<{ [key: string]: IExampleCategory }> = ref({});

  function createProject() {
    vscode.postMessage({
      command: "createProject",
      components: components,
      containerFolder: containerDirectory,
      openOcdConfigFiles: openOcdConfigFiles,
      port: selectedPort,
      projectName: projectName,
      target: target.value.target,
      template: selectedTemplate,
    });
  }

  function getTemplateDetail(payload: { pathToOpen: string }) {
    vscode.postMessage({
      command: "getTemplateDetail",
      path: payload.pathToOpen,
    });
  }

  function openComponentFolder() {
    vscode.postMessage({
      command: "loadComponent",
    });
  }

  function openProjectDirectory() {
    vscode.postMessage({
      command: "openProjectDirectory",
    });
  }

  function requestInitialValues() {
    vscode.postMessage({
      command: "requestInitValues",
    });
  }

  return {
    boards,
    components,
    containerDirectory,
    currentComponentPath,
    hasTemplateDetail,
    openOcdConfigFiles,
    projectName,
    selectedBoard,
    selectedFramework,
    selectedPort,
    selectedTemplate,
    serialPortList,
    target,
    targetList,
    templateDetail,
    templatesRootPath,
    createProject,
    getTemplateDetail,
    openComponentFolder,
    openProjectDirectory,
    requestInitialValues,
  };
});
