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
</script>

<template>
  <div>
    <Header />
    <PartitionTable @add="addEmptyRow" @save="store.save">
      <Row
        v-for="(row, i) in store.rows"
        :key="i"
        :name.sync="row.name"
        :type.sync="row.type"
        :subtype.sync="row.subtype"
        :offset.sync="row.offset"
        :size.sync="row.size"
        :flag.sync="row.flag"
        :error="row.error"
        @delete="store.rows.splice(i, 1)"
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
