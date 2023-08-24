/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd August 2023 5:27:30 pm
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
import { ref } from "vue";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface IState {
  espIdf: string;
  extensionVersion: string;
  showOnInit: boolean;
}

export const useWelcomeStore = defineStore("welcome", () => {
  const espIdf = ref("");
  const extensionVersion = ref("");
  const showOnInit = ref(true);

  function exploreComponents() {
    vscode.postMessage({
      command: "exploreComponents",
    });
  }

  function openImportProject() {
    vscode.postMessage({
      command: "importProject",
    });
  }

  function openNewProjectPanel() {
    vscode.postMessage({
      command: "newProject",
    });
  }
  function openSetupPanel() {
    vscode.postMessage({
      command: "configureExtension",
    });
  }
  function openShowExamplesPanel() {
    vscode.postMessage({
      command: "showExamples",
    });
  }
  function requestInitValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  }

  function updateShowOnboardingOnInit() {
    vscode.postMessage({
      command: "updateShowOnboardingOnInit",
      showOnInit: showOnInit,
    });
  }

  return {
    espIdf,
    extensionVersion,
    showOnInit,
    exploreComponents,
    openImportProject,
    openNewProjectPanel,
    openSetupPanel,
    openShowExamplesPanel,
    requestInitValues,
    updateShowOnboardingOnInit
  };
});
