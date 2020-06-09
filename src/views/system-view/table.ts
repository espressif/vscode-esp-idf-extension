import { events } from "../../espIdf/tracing/system-view/model";

const WINDOW_SIZE = 2;

function generateEventTableTR(
  event: events,
  index: number,
  eventLookupTable: Map<number, string>
): Array<string> {
  const tr = [];

  tr.push(
    index,
    event.ts,
    event.core_id,
    event.ctx_name,
    eventLookupTable.get(event.id) || event.id
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
): Array<Array<string>> {
  const holder = [];
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
