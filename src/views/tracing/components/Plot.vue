<script setup lang="ts">
import * as Plotly from "plotly.js-dist-min";
import { onMounted, onUnmounted, ref, Ref, watch } from "vue";
import { HeapPlotTrace, PlotPointDetail } from "../heapTraceModel";
import { TraceInfo } from "../store";

const props = defineProps<{
  chart: HeapPlotTrace[];
  revision: number;
}>();

const chartProp: Ref<{
  displaylogo: boolean;
  scrollZoom: boolean;
  responsive: boolean;
  displayModeBar: boolean;
  modeBarButtonsToRemove: string[];
}> = ref({
  displaylogo: false,
  scrollZoom: true,
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
});

const layout: Ref<Record<string, unknown>> = ref({
  dragmode: "pan",
  hovermode: "closest",
  title: "Heap Trace",
  height: 480,
  margin: { t: 72, r: 24, b: 56, l: 72 },
  legend: {
    orientation: "h",
    yanchor: "bottom",
    y: 1.02,
    x: 0,
  },
  yaxis: {
    fixedrange: false,
    title: "Memory Used (bytes)",
  },
  xaxis: {
    title: "Time (seconds)",
  },
});

const emit = defineEmits<{
  selected: [info: TraceInfo];
  "toggle-trace": [name: string, visible: boolean];
  "isolate-trace": [name: string, showAll: boolean];
}>();

let resizeObserver: ResizeObserver | undefined;
let plotReady = false;
let drawQueued = false;
let legendClickTimer: ReturnType<typeof setTimeout> | undefined;

function plotClickHandler(event: {
  points?: Array<{ pointIndex: number; data: HeapPlotTrace }>;
}) {
  const point = event.points?.[0];
  if (!point?.data.clickable) {
    return;
  }
  const detail: PlotPointDetail | undefined = point.data.details[point.pointIndex];
  if (!detail) {
    return;
  }
  emit("selected", {
    type: detail.kind === "alloc" ? "Allocated" : "Freed",
    task: detail.context,
    callers: detail.callers,
    addr: detail.address,
    ts: detail.timestamp,
    size: detail.size,
    detailIndex: detail.detailIndex,
  });
}

function clearLegendClickTimer() {
  if (legendClickTimer !== undefined) {
    clearTimeout(legendClickTimer);
    legendClickTimer = undefined;
  }
}

function legendClickHandler(event: {
  curveNumber?: number;
  data?: Array<{ name?: string; visible?: boolean | string }>;
}) {
  const curveNumber = event.curveNumber ?? 0;
  const trace = event.data?.[curveNumber];
  if (!trace?.name) {
    return false;
  }
  const name = trace.name;
  const shown = trace.visible !== false && trace.visible !== "legendonly";
  clearLegendClickTimer();
  legendClickTimer = setTimeout(() => {
    legendClickTimer = undefined;
    emit("toggle-trace", name, !shown);
  }, 400);
  return false;
}

function legendDoubleClickHandler(event: {
  curveNumber?: number;
  data?: Array<{ name?: string; visible?: boolean | string }>;
}) {
  clearLegendClickTimer();
  const curveNumber = event.curveNumber ?? 0;
  const traces = event.data ?? [];
  const trace = traces[curveNumber];
  if (!trace?.name) {
    return false;
  }
  const othersHidden = traces.every((item, index) => {
    if (index === curveNumber || !item.name) {
      return true;
    }
    return item.visible === false || item.visible === "legendonly";
  });
  emit("isolate-trace", trace.name, othersHidden);
  return false;
}

function applyRevision() {
  layout.value.uirevision = props.revision;
  const xaxis = layout.value.xaxis as Record<string, unknown>;
  const yaxis = layout.value.yaxis as Record<string, unknown>;
  xaxis.uirevision = props.revision;
  yaxis.uirevision = props.revision;
}

function draw() {
  if (!plotReady) {
    drawQueued = true;
    return;
  }
  applyRevision();
  Plotly.react("plot", props.chart, layout.value, chartProp.value);
}

onMounted(() => {
  const style = window.getComputedStyle(document.documentElement);
  const bgColor = style.getPropertyValue("--vscode-editor-background");
  const fontColor = style.getPropertyValue("--vscode-editor-foreground");
  layout.value.paper_bgcolor = bgColor;
  layout.value.plot_bgcolor = bgColor;
  layout.value.font = { color: fontColor };
  applyRevision();

  Plotly.newPlot("plot", props.chart, layout.value, chartProp.value).then((plot) => {
    plotReady = true;
    plot.on("plotly_click", plotClickHandler);
    plot.on("plotly_legendclick", legendClickHandler);
    plot.on("plotly_legenddoubleclick", legendDoubleClickHandler);
    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const height = entries[0]?.contentRect.height ?? 0;
      // v-show hides Overview with display:none. Plotly rejects resize then.
      if (width === 0 || height === 0) {
        return;
      }
      void Promise.resolve(Plotly.Plots.resize(plot)).catch(
        (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("displayed plot div")) {
            return;
          }
          console.error(error);
        }
      );
    });
    resizeObserver.observe(plot);
    if (drawQueued) {
      drawQueued = false;
      draw();
    }
  });
});

onUnmounted(() => {
  clearLegendClickTimer();
  resizeObserver?.disconnect();
  Plotly.purge("plot");
});

watch(
  () => props.chart,
  () => {
    draw();
  }
);
</script>

<template>
  <div id="plot"></div>
</template>

<style scoped>
#plot {
  width: 100%;
  min-height: 480px;
}
</style>
