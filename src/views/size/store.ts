/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 6th September 2023 7:22:58 pm
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

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

const SEC = 1000;

export const useSizeStore = defineStore("size", () => {
  const archives: Ref<{ [key: string]: any}> = ref({});
  const isFlashing: Ref<boolean> = ref(false);
  const isOverviewEnabled: Ref<boolean> = ref(true);
  const overviewData: Ref<object> = ref({});
  const searchText: Ref<string> = ref("");

  function retryClicked() {
    if (vscode) {
      vscode.postMessage({
        command: "retry",
      });
    }
  }

  function flashClicked(context) {
    if (vscode) {
      context.state.isFlashing = true;
      setTimeout(() => {
        context.state.isFlashing = false;
      }, 10 * SEC);
      vscode.postMessage({
        command: "flash",
      });
    }
  }

  function requestInitialValues() {
    vscode.postMessage({
      command: "requestInitialValues",
    });
  }

  function setFiles(files) {
    Object.keys(files).forEach((file) => {
      const archiveFileName = file.split(":");
      const archiveName = archiveFileName[0];
      const fileName = archiveFileName[1];
      if (archives[archiveName] && !archives[archiveName].files) {
        archives[archiveName]["files"] = {};
      }
      archives[archiveName].files[fileName] = files[file];
    });
    Object.keys(archives).forEach((archive) => {
      archives[archive].isFileInfoVisible = false;
    });
  }

  function toggleArchiveFileInfoTable(archiveName: string) {
    Object.keys(archives).forEach((archive) => {
      let toggleVisibility = false;
      if (archive === archiveName) {
        toggleVisibility = !archives[archive].isFileInfoVisible;
      }
      archives[archive].isFileInfoVisible = toggleVisibility;
    });
  }

  return { 
    archives,
    isFlashing,
    isOverviewEnabled,
    overviewData,
    searchText,
    retryClicked,
    flashClicked,
    requestInitialValues,
    setFiles,
    toggleArchiveFileInfoTable
  };
});
