<template>
  <div>
    <Loading v-if="isLoading" />
    <div class="container" v-else>
      <Settings />
      <br />
      <t
        name="Events Table"
        v-if="settings.EventsTableVisible"
        :height="settings.EventsTableHeight"
      >
        <template v-slot:th>
          <th>ID</th>
          <th>Timestamp</th>
          <th>Core ID</th>
          <th>Context</th>
          <th>Event</th>
          <th>Description</th>
        </template>
        <template v-slot:tr>
          <tr
            v-for="(tr, i) in eventsTable"
            :key="i"
            @click="onEventsTableTRClicked(tr.st, tr.end)"
          >
            <td v-for="(d, j) in tr.tr" :key="j">
              {{ d }}
            </td>
          </tr>
        </template>
      </t>
      <br />
      <Plot v-show="settings.TimelineVisible" />
      <br />
      <template v-if="settings.ContextInfoTableVisible">
        <select v-model="CoreFilter" class="is-pulled-right">
          <option disabled value="">Please select which core</option>
          <option value="">Both Core</option>
          <option value="0">Core# 0</option>
          <option value="1">Core# 1</option>
        </select>
        <t name="Context Info Table" :height="settings.ContextInfoTableHeight">
          <template v-slot:th>
            <th>Core#</th>
            <th>Name</th>
            <th>Activations</th>
            <th>Total Run Time(ms)</th>
            <th>Time Interrupted(ms)</th>
            <th>CPU Load</th>
            <th>Last Run Time(ms)</th>
          </template>
          <template v-slot:tr>
            <tr v-for="(tr, i) in filteredContextInfoTable" :key="i">
              <td v-for="(d, j) in tr" :key="j">
                {{ d }}
              </td>
            </tr>
          </template>
        </t>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import "bulma/css/bulma.min.css";
import Vue from "vue";
import Component from "vue-class-component";
import { State } from "vuex-class";
import * as Plotly from "plotly.js-dist";
import Table from "./components/Table.vue";
import Loading from "./components/Loading.vue";
import Plot from "./components/Plot.vue";
import Settings from "./components/Settings.vue";
import { SystemViewUISettings } from "./store";

@Component({ components: { Loading, Plot, Settings, t: Table } })
export default class App extends Vue {
  @State("isLoading") private isLoading: boolean;
  @State("contextInfoTable") private contextInfoTable;
  @State("eventsTable") private eventsTable;
  @State("settings") private settings: SystemViewUISettings;

  CoreFilter = "";

  onEventsTableTRClicked(st: number, en: number) {
    Plotly.relayout("plot", { "xaxis.range": [st, en] });
  }

  public get filteredContextInfoTable() {
    if (this.CoreFilter !== "") {
      return this.contextInfoTable.filter((row) => row[0] === this.CoreFilter);
    }
    return this.contextInfoTable;
  }
}
</script>

<style>
html,
body {
  height: 100vh;
}
select {
  background-color: var(--vscode-dropdown-background);
  border-color: var(--vscode-dropdown-border);
  color: var(--vscode-editor-foreground);
}
</style>
