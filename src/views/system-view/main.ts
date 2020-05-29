import "./index.scss";
import { fillEventTable } from "./table";
import { drawPlot, layout, setLayoutFromCSS } from "./plot";
import * as Plotly from "plotly.js-dist";
const interact = require("interactjs");

const event_table = document.getElementById("event_table_data");
const plot = document.getElementById("plot");

function resize(el: HTMLElement) {
  interact(el).resizable({
    edges: { left: false, right: false, bottom: true, top: true },
    listeners: {
      move(event) {
        var target = event.target;
        var x = 0;
        var y = 0;

        // update the element's style
        target.style.width = event.rect.width + "px";
        target.style.height = event.rect.height + "px";

        Plotly.relayout(el, { height: event.rect.height });

        // translate when resizing from top or left edges
        x += event.deltaRect.left;
        y += event.deltaRect.top;

        target.style.webkitTransform = target.style.transform =
          "translate(" + x + "px," + y + "px)";
      },
    },
  });
}

window.addEventListener("message", (evt: MessageEvent) => {
  const message: { command: string; value: any } = evt.data;
  switch (message.command) {
    case "initialLoad":
      setImmediate(() => {
        const frag = fillEventTable(message.value);
        event_table.appendChild(frag);
      });
      setImmediate(() => {
        setLayoutFromCSS(window.getComputedStyle(document.documentElement));
        const plotData = drawPlot(message.value);
        Plotly.newPlot(plot, plotData, layout, {
          displaylogo: false,
          scrollZoom: true,
          responsive: true,
        });
        resize(plot);
      });
      break;
    default:
      console.warn(`Message not understood, ${message}`);
      break;
  }
});
