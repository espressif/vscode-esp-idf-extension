import "./index.scss";
import { fillEventTable } from "./table";
import { drawPlot, layout, setLayoutFromCSS } from "./plot";
import * as Plotly from "plotly.js-dist";
import { eventNameMap, resize } from "./util";
import { fillStatsTable } from "./stats";

const event_table = document.getElementById("event_table_data");
const plot = document.getElementById("plot");
const loading = document.getElementById("loading");
const content = document.getElementById("content");
const statsTableBody = document.getElementById("context_info_table");
content.style.display = "none";

window.addEventListener("message", (evt: MessageEvent) => {
  const message: { command: string; value: any } = evt.data;
  switch (message.command) {
    case "initialLoad":
      setImmediate(() => {
        resize(plot);
        const eventNameLookupTable = eventNameMap(message.value.streams);
        const frag = fillEventTable(message.value, eventNameLookupTable);
        event_table.appendChild(frag);
        setLayoutFromCSS(window.getComputedStyle(document.documentElement));
        const plotData = drawPlot(message.value);
        fillStatsTable(plotData, statsTableBody);
        loading.style.display = "none";
        content.style.display = "block";
        Plotly.newPlot(plot, plotData, layout, {
          displaylogo: false,
          scrollZoom: true,
          responsive: true,
        });
      });
      break;
    default:
      console.warn(`Message not understood, ${message}`);
      break;
  }
});
