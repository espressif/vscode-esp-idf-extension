<script setup lang="ts">
import { usePartitionTableStore } from "./store";
import Header from "./components/Header.vue";
import PartitionTable from "./components/PartitionTable.vue";
import Row from "./components/Row.vue";

const store = usePartitionTableStore();
function addEmptyRow() {
  store.addRow({
    name: "",
    error: "",
    type: "",
    subtype: "",
    offset: "",
    size: "",
    flag: false,
  });
}

function updateRow(index: number, prop: string, newValue: any) {
  store.rows[index].error = "";
  store.rows[index][prop] = newValue;
}
</script>

<template>
  <div id="app">
    <Header />
    <div class="settings-content">
      <div class="settings-section">
        <div class="settings-section-content">
          <PartitionTable @add="addEmptyRow" @save="store.save">
            <Row
              v-for="(row, i) in store.rows"
              :key="i"
              :sName="row.name"
              :sType="row.type"
              :sSubType="row.subtype"
              :sOffset="row.offset"
              :sSize="row.size"
              :sFlag="row.flag"
              :error="row.error ? row.error : ''"
              @delete="store.rows.splice(i, 1)"
              @updateRow="(prop, newValue) => updateRow(i, prop, newValue)"
            />
          </PartitionTable>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";
@import "~@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css";

#app {
  padding: 1rem;
  color: var(--vscode-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
}

.settings-section-content {
  padding: 1rem;
}

.vscode-input,
.vscode-textarea,
.vscode-select select {
  height: 28px;
  padding: 0 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.vscode-input:hover,
.vscode-textarea:hover,
.vscode-select select:hover {
  border-color: var(--vscode-input-border);
}

.vscode-input:focus,
.vscode-textarea:focus,
.vscode-select select:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-textarea {
  height: auto;
  min-height: 28px;
  padding: 4px 8px;
  resize: vertical;
}

.vscode-select {
  position: relative;
  display: inline-block;
  width: 100%;
}

.vscode-select select {
  width: 100%;
  appearance: none;
  padding-right: 24px;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 16px;
}
</style>
