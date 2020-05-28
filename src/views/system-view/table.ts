import { events } from "../../espIdf/tracing/system-view/model";

function generateEventTableTR(
  event: events,
  index: number
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

  if (event.params && event.params.desc) {
    tr.appendChild(createTDWithData(event.params.desc));
  } else {
    tr.appendChild(createTDWithData(""));
  }

  return tr;
}

export function fillEventTable(mcore: any): DocumentFragment {
  const holder = document.createDocumentFragment();
  mcore.events.forEach((event: events, index: number) =>
    holder.appendChild(generateEventTableTR(event, index))
  );
  return holder;
}
