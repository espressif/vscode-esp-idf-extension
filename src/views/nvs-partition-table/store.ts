/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th August 2023 12:05:55 pm
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
import { Ref, ref } from "vue";
import { JSON2CSV, validateRows } from "./util";
import { defineStore } from "pinia";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export namespace NvsPartitionTable {
  export interface IRow {
    key: string;
    type: string;
    encoding: string;
    value: string;
    error: string;
  }
  export interface State {
    dirty: Boolean;
    encrypt: Boolean;
    encryptKeyPath: string;
    generateKey: Boolean;
    partitionSize: string;
    partitionSizeError: string;
    rows: Array<IRow>;
  }
}

export const useNvsPartitionTableStore = defineStore(
  "nvsPartitionTable",
  () => {
    const dirty: Ref<boolean> = ref(false);
    const encrypt: Ref<boolean> = ref(false);
    const encryptKeyPath: Ref<string> = ref("");
    const generateKey: Ref<boolean> = ref(true);
    const partitionSize: Ref<string> = ref("");
    let partitionSizeError: Ref<string> = ref("");
    const rows: Ref<NvsPartitionTable.IRow[]> = ref([]);

    function genPartition() {
      partitionSizeError.value = "";
      if (!partitionSize) {
        partitionSizeError.value = "Size can't be empty";
      }
      vscode.postMessage({
        command: "genNvsPartition",
        encrypt,
        encryptKeyPath,
        generateKey,
        partitionSize,
      });
    }

    function initDataRequest() {
      vscode.postMessage({
        command: "getInitialData",
      });
    }

    function openKeyFile() {
      vscode.postMessage({
        command: "openKeyFile",
      });
    }

    function save() {
      partitionSizeError.value = "";
      if (!rows.value.length) {
        return;
      }
      rows.value.forEach((row) => {
        row.error = "";
      });
      const rowResults = validateRows(rows.value);

      for (const result of rowResults) {
        if (!result.ok) {
          rows[result.rowIndex].error = result.errorMsg;
          vscode.postMessage({
            command: "showErrorMessage",
            error: result.errorMsg,
          });
          return;
        }
      }
      const csv = JSON2CSV(rows.value);
      dirty.value = false;
      vscode.postMessage({
        command: "saveDataRequest",
        csv,
      });
    }

    return {
      dirty,
      encrypt,
      encryptKeyPath,
      generateKey,
      partitionSize,
      partitionSizeError,
      rows,
      genPartition,
      initDataRequest,
      openKeyFile,
      save,
    };
  }
);
