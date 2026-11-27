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
import {
  applySize,
  fitSize,
  LayoutInputRow,
  reclaimSize,
  recommendSize,
} from "./layout";
import { createPresetRows } from "./presets";
import { CSV2JSON, JSON2CSV, isValidJSON } from "./util";
import { DEFAULT_PARTITION_TABLE_OFFSET } from "../../espIdf/partition-table/flashMetadata";

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
    flag: boolean;
    /** CSV flag `readonly`. Omitted on older rows. */
    readOnly?: boolean;
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
  const flashSizeBytes: Ref<number> = ref(0);
  const partitionTableOffset: Ref<number> = ref(DEFAULT_PARTITION_TABLE_OFFSET);
  const keepEqualOtaSlots: Ref<boolean> = ref(true);
  const pasteError: Ref<string> = ref("");

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
      rows.value[row].error = error;
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

  function loadInitial(
    next: PartitionTable.Row[],
    flashBytes: number,
    tableOffset: number
  ) {
    rows.value = next;
    flashSizeBytes.value = flashBytes;
    partitionTableOffset.value = tableOffset;
    dirty.value = false;
  }

  function replaceRows(next: PartitionTable.Row[]) {
    rows.value = next;
    dirty.value = true;
  }

  function applyPreset(id: string) {
    const next = createPresetRows(id);
    if (!next) {
      return;
    }
    replaceRows(next);
  }

  function setKeepEqualOtaSlots(enabled: boolean) {
    keepEqualOtaSlots.value = enabled;
  }

  function applySizeUpdates(updates: { index: number; size: string }[]) {
    let changed = false;
    for (const update of updates) {
      const row = rows.value[update.index];
      if (!row || row.size === update.size) {
        continue;
      }
      row.size = update.size;
      row.error = "";
      changed = true;
    }
    if (changed) {
      dirty.value = true;
    }
  }

  function layoutRows(): LayoutInputRow[] {
    return rows.value;
  }

  function setPartitionSize(index: number, bytes: number) {
    applySizeUpdates(
      applySize(
        layoutRows(),
        index,
        bytes,
        flashSizeBytes.value,
        partitionTableOffset.value,
        keepEqualOtaSlots.value
      )
    );
  }

  function reclaimPartition(index: number) {
    applySizeUpdates(
      reclaimSize(
        layoutRows(),
        index,
        flashSizeBytes.value,
        partitionTableOffset.value,
        keepEqualOtaSlots.value
      )
    );
  }

  function fitPartition(index: number) {
    applySizeUpdates(
      fitSize(
        layoutRows(),
        index,
        flashSizeBytes.value,
        partitionTableOffset.value,
        keepEqualOtaSlots.value
      )
    );
  }

  function recommendPartition(index: number) {
    applySizeUpdates(
      recommendSize(
        layoutRows(),
        index,
        flashSizeBytes.value,
        partitionTableOffset.value,
        keepEqualOtaSlots.value
      )
    );
  }

  function copyCsv() {
    vscode.postMessage({
      command: "copyCsv",
      csv: JSON2CSV(rows.value),
    });
  }

  function requestPaste() {
    vscode.postMessage({
      command: "pasteCsv",
    });
  }

  function consumePaste(csv: string) {
    const parsed = CSV2JSON<PartitionTable.Row>(csv);
    if (!parsed.length) {
      pasteError.value = "Clipboard does not contain an ESP-IDF partition table CSV.";
      return;
    }
    replaceRows(parsed);
  }

  function clearPasteError() {
    pasteError.value = "";
  }

  return { 
    rows,
    dirty,
    flashSizeBytes,
    partitionTableOffset,
    keepEqualOtaSlots,
    pasteError,
    addRow,
    deleteRow,
    save,
    initDataRequest,
    loadInitial,
    replaceRows,
    applyPreset,
    setKeepEqualOtaSlots,
    setPartitionSize,
    reclaimPartition,
    fitPartition,
    recommendPartition,
    copyCsv,
    requestPaste,
    consumePaste,
    clearPasteError,
  }
});