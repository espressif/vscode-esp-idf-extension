<script setup lang="ts">
import { resize } from "../util";
import * as Plotly from "plotly.js-dist-min";
import { onMounted } from "vue";
import { useSystemViewStore } from "../store";

const store = useSystemViewStore();

onMounted(() => {
  const style = window.getComputedStyle(document.documentElement);
  const bgColor = style.getPropertyValue("--vscode-editor-background");
  const fontColor = style.getPropertyValue("--vscode-editor-foreground");
  store.plotLayout = {
    "paper_bgcolor": bgColor,
    "plot_bgcolor": bgColor,
    "xaxis": {
      "spikecolor": fontColor,
    },
    "font": {
      "color": fontColor
    }
  }
  Plotly.newPlot("plot", store.plotData, store.plotLayout, {
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
