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
    });
  });
  return rows;
}
