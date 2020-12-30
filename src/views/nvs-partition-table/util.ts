/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 17th December 2020 7:15:59 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EOL } from "os";
import { NvsPartitionTable } from "./store";

export interface IRowValidationResult {
  errorMsg: string;
  rowIndex: number;
  ok: boolean;
}

export function validateRows(rows: NvsPartitionTable.IRow[]) {
  const validationResults: IRowValidationResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    let result: IRowValidationResult = {
      ok: true,
      errorMsg: "",
      rowIndex: -1,
    };
    const validationResult = isInValidRow(rows[i]);
    if (!!validationResult) {
      result.errorMsg = validationResult;
      result.ok = false;
      result.rowIndex = i;
    } else if (i === 0 && rows[0].type !== "namespace") {
      result.errorMsg = "First row should be of type namespace";
      result.ok = false;
      result.rowIndex = i;
    }
    validationResults.push(result);
  }
  return validationResults;
}

export function isInValidRow(row: NvsPartitionTable.IRow): string {
  if (!row.key) {
    return "Key field is required";
  }
  if (row.key.length > 15) {
    return "Maximum key length is 15 characters";
  }

  if (!row.type) {
    return "Type field is required";
  }

  if (row.type === "namespace") {
    return;
  }

  if (!row.encoding) {
    return "Encoding is required";
  }

  if (!row.value) {
    return "Value is required";
  }

  if (row.type === "file") {
    return;
  }

  if (row.encoding === "string") {
    const bytes = Buffer.byteLength(row.value);
    if (bytes > 4000) {
      return "String value is limited to 4000 bytes";
    }
    return;
  }

  const numberTypes = ["u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64"];
  if (numberTypes.indexOf(row.encoding) !== -1) {
    if (!/^-?\d+$/.test(row.value)) {
      return "Value is not a valid number";
    }
    const typeInt = parseInt(row.value);

    let minValue: number, maxValue: number;
    const minValues = {
      u8: 0,
      i8: -128,
      u16: 0,
      i16: -32768,
      u32: 0,
      i32: -2147483648,
      u64: 0,
      i64: -9223372036854775808,
    };
    const maxValues = {
      u8: 255,
      i8: 127,
      u16: 65535,
      i16: 32767,
      u32: 4294967295,
      i32: 2147483647,
      u64: 18446744073709551615,
      i64: 9223372036854775807,
    };
    minValue = minValues[row.encoding];
    maxValue = maxValues[row.encoding];
    if (
      typeof minValue !== "undefined" &&
      maxValue &&
      (typeInt < minValue || typeInt > maxValue)
    ) {
      return `Out of range for ${row.encoding}`;
    }
  }
  return;
}

export const expectedHeader = "key,type,encoding,value";

export function JSON2CSV(rows: NvsPartitionTable.IRow[]) {
  let csv = expectedHeader + EOL;
  for (const row of rows) {
    if (
      row.key === "" &&
      row.type === "" &&
      row.encoding === "" &&
      row.value === ""
    ) {
      return;
    }
    csv += `${row.key},${row.type},${row.encoding},${row.value}${EOL}`;
  }
  return csv;
}

export function csv2Json(csv: string) {
  const rows = new Array<NvsPartitionTable.IRow>();
  const lines = csv.split(EOL);
  const header = lines.shift();
  if (header !== expectedHeader) {
    console.log("Not a NVS partition table csv, skipping...");
    return rows;
  }
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "") {
      continue;
    }
    let cols = lines[i].split(",");
    rows.push({
      key: cols.shift(),
      type: cols.shift(),
      encoding: cols.shift(),
      value: cols.shift(),
      error: undefined,
    });
  }
  return rows;
}
