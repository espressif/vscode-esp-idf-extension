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
  store.rows[index][prop] = newValue;
}
</script>

<template>
  <div>
    <Header />
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
</template>

<style lang="scss">
@import "../commons/espCommons.scss";
@import "~@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css";
.input,
.textarea,
.select select {
  border-color: var(--vscode-input-background);
}
</style>
