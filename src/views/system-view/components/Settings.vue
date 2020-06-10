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
              <input type="checkbox" v-model="settings.EventsTableVisible" />
              Events Table
            </label>
            &nbsp;
            <label class="checkbox">
              <input
                type="checkbox"
                v-model="settings.ContextInfoTableVisible"
              />
              Context Info Table
            </label>
            &nbsp;
            <label class="checkbox">
              <input type="checkbox" v-model="settings.TimelineVisible" />
              Timeline
            </label>
          </div>
        </div>
        <div class="columns">
          <div class="column">
            <select
              v-model="settings.TimelineHeight"
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
              v-model="settings.TimelineBarWidth"
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
              v-model="settings.TimelineContextSwitchLineColor"
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
}
</style>

<script lang="ts">
import Vue from "vue";
import * as Plotly from "plotly.js-dist";
import { Component } from "vue-property-decorator";
import { State } from "vuex-class";
import { SystemViewUISettings } from "../store";
@Component
export default class Settings extends Vue {
  @State("settings") private settings: SystemViewUISettings;
  @State("plotData") private plotData;
  active = false;
  show() {
    this.active = true;
  }
  dismiss() {
    this.active = false;
  }
  timeLineHeightChanged() {
    Plotly.relayout("plot", { height: this.settings.TimelineHeight });
  }
  timeLineBarWidthChanged() {
    const indices = [];
    this.plotData.forEach((d, i) => {
      if (d.name !== "context-switch") {
        indices.push(i);
      }
    });
    Plotly.restyle(
      "plot",
      { "line.width": this.settings.TimelineBarWidth },
      indices
    );
  }
  timelineContextSwitchLineColorChanged() {
    const indices = [];
    this.plotData.forEach((d, i) => {
      if (d.name === "context-switch") {
        indices.push(i);
      }
    });
    Plotly.restyle(
      "plot",
      { "line.color": this.settings.TimelineContextSwitchLineColor },
      indices
    );
  }
}
</script>
