/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th August 2023 6:24:14 pm
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

import { EOL } from "os";
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
    if (
      !row.type.match(
        /^(0x00|0x01|app|data)$|^((0x)((([4-9a-e]|[A-E])[0-9a-fA-F])|([fF]([0-9a-e]|[A-E]))))$|^([01][0-9][0-9]|2[0-4][0-9]|25[0-4])$/
      )
    ) {
      return "Partition type field can be specified as app (0x00) or data (0x01). Or it can be a number 0-254 (or as hex 0x00-0xFE). Types 0x00-0x3F are reserved for ESP-IDF core functions.";
    }

    // SubType
    if (!row.subtype) {
      return "SubType is required";
    }
    // For type "app"
    if (row.type.match(/^(0x00|app)$/)) {
      if (
        !row.subtype.match(
          /^(factory|test|ota_[0-9]|ota_1[0-5]|test|0x00)$|^(0x)(([1][0-9a-fA-F])|[2][0])$/
        )
      ) {
        return "When type is \"app\", the subtype field can only be specified as \"factory\" (0x00), \"ota_0\" (0x10) … \"ota_15\" (0x1F) or \"test\" (0x20)";
      }
    }
    // For type "data"
    if (row.type.match(/^(0x01|data)$/)) {
      if (
        !row.subtype.match(
          /^(ota|phy|nvs|nvs_keys|spiffs|coredump|fat)$|^(0x)(([0][0-6])|[8][0-2])$/
        )
      ) {
        return "When type is \"data\", the subtype field can be specified as \"ota\" (0x00), \"phy\" (0x01), \"nvs\" (0x02), \"nvs_keys\" (0x04), \"fat\" (0x81), \"spiffs\" (0x82) or a range of other component-specific subtypes (0x05, 0x06, 0x80, 0x81, 0x82)";
      }
    }
    // For custom type
    if (row.type.match(/^((0x)[4-9a-fA-F]([0-9a-e]|[A-E]))$/)) {
      if (!row.subtype.match(/^((0x)[0-9a-fA-F]([0-9a-e]|[A-E]))$/)) {
        return "If the partition type is any application-defined value (range 0x40-0xFE), then subtype field can be any value chosen by the application (range 0x00-0xFE).";
      }
    }

    // Offset
    if (
      row.offset !== "" &&
      !row.offset.match(/(^((0x)[0-9a-fA-F]*)$)|^([0-9]*)$|([0-9]*((K|M)$))/)
    ) {
      return "Offsets can be specified as decimal numbers, hex numbers with the prefix 0x, size multipliers K or M (1024 and 1024*1024 bytes) or left empty.";
    }

    // Size
    if (!row.size) {
      return "Size is required";
    }
    if (!row.size.match(/(^((0x)[0-9a-fA-F]*)$)|^([0-9]*)$|([0-9]*((K|M)$))/)) {
      return "Size can be specified as decimal numbers, hex numbers with the prefix 0x, or size multipliers K or M (1024 and 1024*1024 bytes).";
    }

    return "";
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
    csv += `${row.name},${row.type},${row.subtype},${row.offset},${row.size},${flag},${EOL}`;
  });
  return csv;
}

export function CSV2JSON<T>(csv: String): T[] {
  const rows = [];
  const lines = csv.split(EOL);
  const matches = csv.match(
    /#\s*Name,\s*Type,\s*SubType,\s*Offset,\s*Size,\s*Flags/g
  );
  if (!matches || !matches.length) {
    console.log("Not a partition table csv, skipping...");
    return rows;
  }
  lines.forEach((line) => {
    if (line === "" || line.startsWith("#")) {
      return;
    }
    const cols = line.split(",");
    rows.push({
      name: cols.shift().trim(),
      type: cols.shift().trim(),
      subtype: cols.shift().trim(),
      offset: cols.shift().trim(),
      size: cols.shift().trim(),
      flag: cols.shift().trim() === "encrypted" ? true : false,
      error: undefined,
    });
  });
  return rows;
}
