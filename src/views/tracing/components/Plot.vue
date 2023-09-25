<script setup lang="ts">
import * as Plotly from "plotly.js-dist-min";
import { Ref, onMounted, ref, watch } from "vue";

const props = defineProps<{
  chart: Array<any>;
  events: object;
}>();

const chartProp: Ref<{
  displaylogo: boolean;
  scrollZoom: boolean;
  responsive: boolean;
}> = ref({
  displaylogo: false,
  scrollZoom: true,
  responsive: true,
});
const layout: Ref<{}> = ref({
  yaxis: {
    fixedrange: false,
    title: "Memory Used (in bytes)",
  },
  hovermode: "closest",
  title: "Heap Trace",
  xaxis: {
    title: "time (in seconds)",
  },
});

const emit = defineEmits(["selected"]);

function clickableTrace({ points }) {
  return points[0].data.clickable;
}
function plotClickHandler(d) {
  if (!clickableTrace(d)) {
    return;
  }
  const eventIDs = this.events;
  const traceInfo = {} as any;
  const index = d.points[0].pointIndex;
  const evt = Object.assign({}, d.points[0].data.evt[index]);
  traceInfo.type = evt.id === eventIDs.alloc ? "Allocated" : "Freed";
  traceInfo.task = evt.ctx_name;
  traceInfo.callers = evt.callers;
  traceInfo.addr = evt.addr;
  traceInfo.ts = evt.ts;
  if (evt.id === eventIDs.free) {
    const yaxis = d.points[0].data.y;
    traceInfo.size =
      index !== 0 ? yaxis[index - 1] - yaxis[index] : yaxis[index];
  } else if (evt.id === eventIDs.alloc) {
    traceInfo.size = evt.size;
  }
  emit("selected", traceInfo);
}

onMounted(() => {
  const style = window.getComputedStyle(document.documentElement);
  const bgColor = style.getPropertyValue("--vscode-editor-background");
  const fontColor = style.getPropertyValue("--vscode-editor-foreground");

  layout["paper_bgcolor"] = bgColor;
  layout["plot_bgcolor"] = bgColor;
  layout["font"] = {
    color: fontColor,
  };

  Plotly.newPlot("plot", props.chart, layout.value, chartProp.value);
  const plot = document.getElementById("plot");
  if (plot) {
    plot.addEventListener("plotly_click", (d) => {
      plotClickHandler(d);
    });
  }
});

watch(
  props.chart,
  () => {
    Plotly.react("plot", props.chart, layout.value);
  },
  { deep: true }
);
</script>

<template>
  <div id="plot"></div>
</template>
