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
        <div class="field">
          <span>Timeline Height</span>
          <p class="control">
            <span class="select">
              <select
                v-model="settings.TimelineHeight"
                @change="timeLineHeightChanged"
              >
                <option selected>200</option>
                <option>300</option>
                <option>400</option>
                <option>500</option>
              </select>
            </span>
          </p>

          <span>Timeline Bar Height</span>
          <p class="control">
            <span class="select">
              <select
                v-model="settings.TimelineBarWidth"
                @change="timeLineBarWidthChanged"
              >
                <option selected>10</option>
                <option>12</option>
                <option>14</option>
                <option>15</option>
                <option>17</option>
                <option>20</option>
              </select>
            </span>
          </p>
        </div>
        <!-- <button @click="save">Save</button> -->
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
  background-color: var(--vscode-editor-foreground);
  color: var(--vscode-editor-background);
  padding: 1em;
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
  save() {
    //set setting in store
    this.dismiss();
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
}
</script>
