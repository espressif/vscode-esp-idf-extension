<script setup lang="ts">
import { useSystemViewStore } from "../store";
import * as Plotly from "plotly.js-dist-min";
import { ref } from "vue";

const store = useSystemViewStore();
let active = ref(false);
function show() {
  active.value = true;
}
function dismiss() {
  active.value = false;
}

function timeLineHeightChanged() {
  Plotly.relayout("plot", { height: store.settings.TimelineHeight });
}

function timeLineBarWidthChanged() {
  const indices: number[] = [];
  store.plotData.forEach((d, i) => {
    if (d.name !== "context-switch") {
      indices.push(i);
    }
  });
  Plotly.restyle("plot", { "line.width": store.settings.TimelineBarWidth }, indices);
}
function timelineContextSwitchLineColorChanged() {
  const indices: number[] = [];
  store.plotData.forEach((d, i) => {
    if (d.name === "context-switch") {
      indices.push(i);
    }
  });
  Plotly.restyle(
    "plot",
    { "line.color": store.settings.TimelineContextSwitchLineColor },
    indices
  );
}
</script>

<template>
  <div>
    <p class="is-pulled-right">
      <button @click="show">Settings</button>
    </p>
    <div class="modal" :class="{ 'is-active': active }">
      <div class="modal-background" @click="dismiss"></div>
      <div class="modal-content">
        <div class="field">
          <p>Visibility for Panels</p>
          <div class="control">
            <label class="checkbox">
              <input type="checkbox" v-model="store.settings.EventsTableVisible" />
              Events Table
            </label>
            &nbsp;
            <label class="checkbox">
              <input
                type="checkbox"
                v-model="store.settings.ContextInfoTableVisible"
              />
              Context Info Table
            </label>
            &nbsp;
            <label class="checkbox">
              <input type="checkbox" v-model="store.settings.TimelineVisible" />
              Timeline
            </label>
          </div>
        </div>
        <div class="columns">
          <div class="column">
            <select
              v-model="store.settings.TimelineHeight"
              @change="timeLineHeightChanged"
            >
              <option disabled value="200"
                >Select Timeline Panel Height (in px)</option
              >
              <option value="200">200 (default)</option>
              <option value="300">300</option>
              <option value="400">400</option>
              <option value="500">500</option>
            </select>
          </div>
          <div class="column">
            <select
              v-model="store.settings.TimelineBarWidth"
              @change="timeLineBarWidthChanged"
            >
              <option disabled value="10"
                >Select Timeline Bar Height (in px)</option
              >
              <option value="10">10 (default)</option>
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="15">15</option>
              <option value="17">17</option>
              <option value="20">20</option>
            </select>
          </div>
          <div class="column">
            <select
              v-model="store.settings.TimelineContextSwitchLineColor"
              @change="timelineContextSwitchLineColorChanged"
            >
              <option disabled value="#555555"
                >Select Context Switch Line Color</option
              >
              <option value="#555555">Gray (default)</option>
              <option value="#ffffff">Light</option>
              <option value="#000000">Dark</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
button {
  background-color: var(--vscode-button-background);
  border-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}
.modal-content {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  padding: 1.2em;
  font-size: var(--vscode-font-size);
  width: 65em;
}
</style>
