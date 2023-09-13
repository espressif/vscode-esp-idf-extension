/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th September 2023 9:49:14 am
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

import { events } from "../../espIdf/tracing/system-view/model";
import { eventTableRow } from "./store";

const WINDOW_SIZE = 2;

function generateEventTableTR(
  event: events,
  index: number,
  eventLookupTable: Map<number, string>
): Array<any> {
  const tr: Array<any> = [];

  tr.push(
    index,
    event.ts,
    event.core_id,
    event.ctx_name,
    event.id ? eventLookupTable.get(event.id) : event.id
  );

  if (event.params && event.params.desc) {
    tr.push(event.params.desc);
  } else {
    tr.push("");
  }

  return tr;
}

export function fillEventTable(
  mcore: any,
  eventLookupTable: Map<number, string>
): Array<eventTableRow> {
  const holder: eventTableRow[] = [];
  const len = mcore.events.length;
  for (let i = 0; i < len; i++) {
    const event: events = mcore.events[i];

    const tr = generateEventTableTR(event, i, eventLookupTable);
    const st = i - WINDOW_SIZE < 0 ? 0 : i - WINDOW_SIZE;
    const end = i + WINDOW_SIZE > len - 1 ? len - 1 : i + WINDOW_SIZE;
    holder.push({ tr, st: mcore.events[st].ts, end: mcore.events[end].ts });
  }
  return holder;
}
