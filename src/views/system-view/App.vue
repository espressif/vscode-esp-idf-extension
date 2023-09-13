<script setup lang="ts">
import { useSystemViewStore } from "./store";
import { relayout } from "plotly.js";
import SystemViewTable from "./components/Table.vue";
import Loading from "./components/Loading.vue";
import Plot from "./components/Plot.vue";
import Settings from "./components/Settings.vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const store = useSystemViewStore();
let CoreFilter = "";

const { contextInfoTable, eventsTable, isLoading, settings } = storeToRefs(
  store
);

function onEventsTableTRClicked(st: number, en: number) {
  relayout("plot", { "xaxis.range": [st, en] });
}

const filteredContextInfoTable = computed(() => {
  if (CoreFilter !== "") {
    return contextInfoTable.value.filter((row) => row[0] === CoreFilter);
  }
  return contextInfoTable;
});
</script>

<template>
  <div>
    <Loading v-if="isLoading" />
    <div class="container" v-else>
      <Settings />
      <br />
      <SystemViewTable
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
      </SystemViewTable>
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

<style lang="scss">
@import "../commons/espCommons.scss";
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
