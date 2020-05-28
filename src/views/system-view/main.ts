import "./index.scss";
import { fillEventTable } from "./table";
import { drawPlot, layout } from "./plot";
import * as Plotly from "plotly.js-dist";

const event_table = document.getElementById("event_table_data");
const plot = document.getElementById("plot");

window.addEventListener("message", (evt: MessageEvent) => {
  console.dir(evt);
  const message: { command: string; value: any } = evt.data;
  switch (message.command) {
    case "initialLoad":
      setImmediate(() => {
        const frag = fillEventTable(message.value);
        event_table.appendChild(frag);
      });
      setImmediate(() => {
        const plotData = drawPlot(message.value);
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
