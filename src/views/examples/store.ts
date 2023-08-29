/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 25th August 2023 2:10:19 pm
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
import { ref, Ref } from "vue";
import { IExample, IExampleCategory } from "../../examples/Example";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface IState {
  exampleRootPath: IExampleCategory;
  selectedExample: IExample;
  hasExampleDetail: boolean;
  exampleDetail: string;
}

export const useExamplesStore = defineStore("examples", () => {
  const exampleRootPath: Ref<IExampleCategory> = ref({
    name: "",
    examples: [],
    subcategories: [],
  } as IExampleCategory);
  const selectedExample: Ref<IExample> = ref({
    name: "",
    path: "",
  } as IExample);
  const hasExampleDetail = ref(false);
  const exampleDetail = ref("");

  function showRegistry() {
    vscode.postMessage({
      command: "showRegistry",
    });
  }

  function getExamplesList() {
    vscode.postMessage({ command: "getExamplesList" });
  }

  function openExample(payload: IExample) {
    vscode.postMessage({
      command: "openExampleProject",
      project_path: payload.path,
      name: payload.name,
    });
  }

  function getExampleDetail(payload: { pathToOpen: string }) {
    vscode.postMessage({
      command: "getExampleDetail",
      path: payload.pathToOpen,
    });
  }

  return {
    exampleDetail,
    exampleRootPath,
    hasExampleDetail,
    selectedExample,
    getExamplesList,
    getExampleDetail,
    openExample,
    showRegistry
  };
});
