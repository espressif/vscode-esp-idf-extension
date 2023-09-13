<script setup lang="ts">
import { resize } from "../util";
import { newPlot } from "plotly.js";
import { onMounted } from "vue";
import { useSystemViewStore } from "../store";

const store = useSystemViewStore();

onMounted(() => {
  const style = window.getComputedStyle(document.documentElement);
  const bgColor = style.getPropertyValue("--vscode-editor-background");
  const fontColor = style.getPropertyValue("--vscode-editor-foreground");
  store.plotLayout["paper_bgcolor"] = bgColor;
  store.plotLayout["plot_bgcolor"] = bgColor;
  store.plotLayout["xaxis"]["spikecolor"] = fontColor;
  store.plotLayout["font"]["color"] = fontColor;
  newPlot("plot", store.plotData, store.plotLayout, {
    displaylogo: false,
    scrollZoom: true,
    responsive: true,
  });

  resize("plot");
});
</script>

<template>
  <div>
    <p>Timeline</p>
    <div id="plot"></div>
  </div>
</template>

<style scoped>
#plot {
  box-sizing: border-box;
  touch-action: none;
}
</style>
