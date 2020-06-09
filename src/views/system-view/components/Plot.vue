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

<script lang="ts">
import * as Plotly from "plotly.js-dist";
import Vue from "vue";
import { Component, Watch } from "vue-property-decorator";
import { State } from "vuex-class";
import { resize } from "../util";
@Component
export default class Plot extends Vue {
  @State("plotLayout") private layout;
  @State("plotData") private plotData;

  mounted() {
    const style = window.getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--vscode-editor-background");
    const fontColor = style.getPropertyValue("--vscode-editor-foreground");
    this.layout.paper_bgcolor = bgColor;
    this.layout.plot_bgcolor = bgColor;
    this.layout.xaxis.spikecolor = fontColor;
    this.layout.font.color = fontColor;

    Plotly.newPlot("plot", this.plotData, this.layout, {
      displaylogo: false,
      scrollZoom: true,
      responsive: true,
    });

    resize("plot");
  }

  // @Watch("plotData", { immediate: true, deep: true })
  // onDataChanged(val, oldVal) {
  //   Plotly.react("plot", val, this.layout);
  // }
}
</script>
