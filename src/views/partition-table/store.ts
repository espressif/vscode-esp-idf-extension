/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th August 2023 6:30:42 pm
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
import { JSON2CSV, isValidJSON } from "./util";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  console.error(error);
}

export namespace PartitionTable {
  export interface Row {
    name: string;
    type: string;
    subtype: string;
    offset: string;
    size: string;
    flag: Boolean;
    error: string;
  }
  export interface State {
    rows: Array<Row>;
    dirty: Boolean;
  }
}

export const usePartitionTableStore = defineStore("partitionTable", () => {
  const rows: Ref<PartitionTable.Row[]> = ref([]);
  const dirty: Ref<boolean> = ref(false);

  function addRow(row: PartitionTable.Row) {
    rows.value.push(row);
    dirty.value = true;
  }

  function deleteRow(index: number) {
    rows.value.splice(index, 1);
    dirty.value = true;
  }

  function save() {
    rows.value.forEach((row) => row.error = "");
    const { row, error, ok } = isValidJSON(rows.value);
    if (!ok) {
      rows[row].error = error;
      console.log(error, row);
      vscode.postMessage({
        command: "showErrorMessage",
        error,
      });
      return;
    }
    const csv = JSON2CSV(rows.value);
    dirty.value = false;
    vscode.postMessage({
      command: "saveDataRequest",
      csv,
    });
  }

  function initDataRequest() {
    vscode.postMessage({
      command: "initDataRequest",
    });
  }

  return { 
    rows,
    dirty,
    addRow,
    deleteRow,
    save,
    initDataRequest
  }
});