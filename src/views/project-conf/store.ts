/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 31st August 2023 12:31:34 pm
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
import { Ref, ref } from "vue";
import { ProjectConfElement } from "../../project-conf/projectConfiguration";

declare var acquireVsCodeApi: any;
let vscode: any;

try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export const useProjectConfStore = defineStore("project-config", () => {
  const elements: Ref<{ [key: string]: ProjectConfElement }> = ref({});
  const emptyElement: Ref<ProjectConfElement> = ref({
    build: {
      compileArgs: [],
      ninjaArgs: [],
      buildDirectoryPath: "",
      sdkconfigDefaults: [],
      sdkconfigFilePath: "",
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
  });
  const textDictionary: Ref<{
    add: string;
    save: string;
    discard: string;
    title: string;
  }> = ref({
    add: "Add",
    discard: "Discard",
    save: "Save",
    title: "Project Configuration",
  });

  function requestInitValues() {
    vscode.postMessage({ command: "requestInitialValues" });
  }

  function saveChanges() {
    vscode.postMessage({
      command: "saveProjectConfFile",
      confDict: elements.value,
    });
  }

  function openBuildPath(payload: { confKey: string; sections: string[] }) {
    vscode.postMessage({
      command: "openBuildPath",
      sectionsKeys: payload.sections,
      confKey: payload.confKey,
    });
  }

  function addNewConfigToList(confKey: string) {
    let newConf = {
      build: {
        compileArgs: [],
        ninjaArgs: [],
        buildDirectoryPath: "",
        sdkconfigDefaults: [],
        sdkconfigFilePath: "",
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
    elements[confKey] = newConf;
  }

  function updateConfigElement(payload: {
    confKey: string;
    sections: string[];
    newValue: any;
  }) {
    if (payload.sections && payload.sections.length === 1) {
      elements[payload.confKey][payload.sections[0]] = payload.newValue;
    } else if (
      payload.sections &&
      payload.sections.length === 2 &&
      Object.keys(elements[payload.confKey]).indexOf(payload.sections[0]) !== -1
    ) {
      elements[payload.confKey][payload.sections[0]][payload.sections[1]] =
        payload.newValue;
    }
  }

  function addValueToConfigElement(payload: {
    confKey: string;
    sections: string[];
    valueToAdd: any;
  }) {
    if (payload.sections && payload.sections.length === 1) {
      elements[payload.confKey][payload.sections[0]].push(payload.valueToAdd);
    } else if (
      payload.sections &&
      payload.sections.length === 2 &&
      Object.keys(elements[payload.confKey]).indexOf(payload.sections[0]) !== -1
    ) {
      elements[payload.confKey][payload.sections[0]][payload.sections[1]].push(
        payload.valueToAdd
      );
    }
  }

  function removeValueFromConfigElement(payload: {
    confKey: string;
    sections: string[];
    index: number;
  }) {
    if (payload.sections && payload.sections.length === 1) {
      elements[payload.confKey][payload.sections[0]].splice(payload.index, 1);
    } else if (
      payload.sections &&
      payload.sections.length === 2 &&
      Object.keys(elements[payload.confKey]).indexOf(payload.sections[0]) !== -1
    ) {
      elements[payload.confKey][payload.sections[0]][
        payload.sections[1]
      ].splice(payload.index, 1);
    }
  }

  return {
    elements,
    emptyElement,
    textDictionary,
    addNewConfigToList,
    addValueToConfigElement,
    openBuildPath,
    updateConfigElement,
    removeValueFromConfigElement,
    requestInitValues,
    saveChanges,
  };
});
