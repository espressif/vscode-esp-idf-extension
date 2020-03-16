<template>
  <div id="plot"></div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import * as Plotly from "plotly.js-dist";
const Plot = Vue.extend({
  name: "Plot",
  props: {
    chart: Array,
    events: Object as any
  },
  methods: {
    clickableTrace({ points }) {
      return points[0].data.clickable;
    },
    plotClickHandler(d) {
      if (!this.clickableTrace(d)) {
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
      this.$emit("selected", traceInfo);
    }
  },
  data() {
    return {
      chartProp: {
        displaylogo: false,
        scrollZoom: true,
        responsive: true
      },
      layout: {
        yaxis: {
          fixedrange: false,
          title: "Memory Used (in bytes)"
        },
        hovermode: "closest",
        title: "Heap Trace",
        xaxis: {
          title: "time (in seconds)"
        }
      }
    };
  },
  mounted() {
    Plotly.newPlot("plot", this.chart, this.layout, this.chartProp);
    const plot = document.getElementById("plot") as any;
    plot.on("plotly_click", d => {
      this.plotClickHandler(d);
    });
  },
  watch: {
    chart: {
      handler() {
        Plotly.react("plot", this.chart, this.layout);
      },
      deep: true
    }
  }
});
export default Plot;
</script>

<style lang="scss" scoped></style>
