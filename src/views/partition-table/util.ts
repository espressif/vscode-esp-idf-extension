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
      row.subtype === undefined &&
      row.offset === "" &&
      row.size === "" &&
      row.flag === ""
    ) {
      return;
    }
    let subtype = row.subtype.value ? row.subtype.value : row.subtype.label;
    csv += `${row.name},${row.type},${subtype},${row.offset},${row.size},${row.flag},\n`;
  });
  return csv;
}
