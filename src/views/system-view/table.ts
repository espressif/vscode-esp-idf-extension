import * as Plotly from "plotly.js-dist";
import { events } from "../../espIdf/tracing/system-view/model";

const WINDOW_SIZE = 4;

function generateEventTableTR(
  event: events,
  index: number,
  eventLookupTable: Map<number, string>
): HTMLTableRowElement {
  function createTDWithData(data: string): HTMLTableDataCellElement {
    const td = document.createElement("td");
    td.innerText = data;
    return td;
  }
  const tr = document.createElement("tr");

  tr.appendChild(createTDWithData(index.toString()));
  tr.appendChild(createTDWithData(event.ts.toString()));
  tr.appendChild(createTDWithData(event.core_id.toString()));
  tr.appendChild(createTDWithData(event.ctx_name.toString()));
  tr.appendChild(
    createTDWithData(eventLookupTable.get(event.id) || event.id.toString())
  );

  if (event.params && event.params.desc) {
    tr.appendChild(createTDWithData(event.params.desc));
  } else {
    tr.appendChild(createTDWithData(""));
  }

  return tr;
}

export function fillEventTable(
  mcore: any,
  eventLookupTable: Map<number, string>
): DocumentFragment {
  const holder = document.createDocumentFragment();
  const len = mcore.events.length;
  for (let i = 0; i < len; i++) {
    const event: events = mcore.events[i];

    const tr = generateEventTableTR(event, i, eventLookupTable);
    const st = i - WINDOW_SIZE < 0 ? 0 : i - WINDOW_SIZE;
    const end = i + WINDOW_SIZE > len - 1 ? len - 1 : i + WINDOW_SIZE;
    tr.addEventListener(
      "click",
      trClickHandler(mcore.events[st].ts, mcore.events[end].ts, tr)
    );

    holder.appendChild(tr);
  }
  return holder;
}

function trClickHandler(start: number, end: number, tr: HTMLElement) {
  return () => {
    Plotly.relayout("plot", { "xaxis.range": [start, end] });
  };
}
