/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 16th September 2020 5:09:43 pm
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

import { PartitionTable } from "./store";

export function isValidJSON(
  rows: PartitionTable.Row[]
): { error: string; row: number; ok: boolean } {
  function isInvalidRow(row: PartitionTable.Row): string {
    // NAME
    if (!row.name || row.name === "") {
      return "Name is mandatory";
    }
    if (row.name.length > 16) {
      return "Names longer than 16 characters are not allowed";
    }

    // TYPE
    if (!row.type) {
      return "Type is required";
    }
    const typeErrorStr =
      "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.";
    if (!row.type.match(/^(app|data)$/)) {
      try {
        const typeInt = parseInt(row.type);
        if ((typeInt > 1 && typeInt < 64) || typeInt > 254) {
          return typeErrorStr;
        }
      } catch (error) {
        return typeErrorStr;
      }
    }

    // SubType
    if (!row.subtype) {
      return "SubType is required";
    }

    // Size
    if (!row.size) {
      return "Size is required";
    }
    if (!row.size.match(/^(0[xX][0-9a-fA-F]+)|([0-9]+[KM]?)$/)) {
      return "Size can be either hex number with 0x or decimal number which might end with M or K";
    }

    return undefined;
  }
  let ok = true;
  let error = "";
  let row = -1;
  for (let i = 0; i < rows.length; i++) {
    const resp = isInvalidRow(rows[i]);
    if (resp) {
      ok = false;
      error = resp;
      row = i;
      break;
    }
  }
  return { ok, error, row };
}

export function JSON2CSV(rows: PartitionTable.Row[]): String {
  let csv = `# ESP-IDF Partition Table
# Name, Type, SubType, Offset, Size, Flags
`;
  rows.forEach((row) => {
    //if all the fields are empty skip
    if (
      row.name === "" &&
      row.type === "" &&
      row.subtype === "" &&
      row.offset === "" &&
      row.size === "" &&
      row.flag === false
    ) {
      return;
    }
    let flag = row.flag === true ? "encrypted" : "";
    csv += `${row.name},${row.type},${row.subtype},${row.offset},${row.size},${flag},\n`;
  });
  return csv;
}

export function CSV2JSON(csv: String): PartitionTable.Row[] {
  const rows = new Array<PartitionTable.Row>();
  const lines = csv.split("\n");
  const comment = lines.shift();
  if (!comment.includes("# ESP-IDF Partition Table")) {
    console.log("Not a partition table csv, skipping...");
    return rows;
  }
  const headers = lines.shift();
  lines.forEach((line) => {
    if (line === "") {
      return;
    }
    const cols = line.split(",");
    rows.push({
      name: cols.shift(),
      type: cols.shift(),
      subtype: cols.shift(),
      offset: cols.shift(),
      size: cols.shift(),
      flag: cols.shift() === "encrypted" ? true : false,
      error: undefined,
    });
  });
  return rows;
}
