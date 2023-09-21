<script setup lang="ts">
import { onMounted } from "vue";
import Header from "./components/Header.vue";
import PartitionTable from "./components/PartitionTable.vue";
import Row from "./components/Row.vue";
import { useNvsPartitionTableStore } from "./store";
import { findEncodingTypes } from "./util";
import { error } from "console";

const store = useNvsPartitionTableStore();

function addNewRow() {
  store.rows.push({
    key: "",
    type: "",
    encoding: "",
    value: "",
    error: "",
  });
}

function updateEncoding(index: number, newType: string) {
  const encodingTypes = findEncodingTypes(newType);
  if (newType === "namespace") {
    store.rows[index].encoding = "";
  } else if (encodingTypes.indexOf(newType) === -1) {
    store.rows[index].encoding = encodingTypes[0];
  }
}

function updateRow(index: number, prop: string, newValue: string) {
  store.rows[index][prop] = newValue;
  if (prop === "type") {
    updateEncoding(index, newValue);
  }
}

onMounted(() => {
  store.initDataRequest();
});
</script>

<template>
  <div>
    <Header></Header>
    <PartitionTable @addNewRow="addNewRow" @save="store.save">
      <Row
        v-for="(row, i) in store.rows"
        @delete="store.rows.splice(i, 1)"
        :key="i"
        :encoding="row.encoding"
        :rowError="row.error ? row.error : ''"
        :rowKey="row.key"
        :rowValue="row.value"
        :rowType="row.type"
        @updateRow="(prop: string, newValue: string) => updateRow(i, prop, newValue)"
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

.checkbox:hover {
  color: var(--vscode-button-background);
}
</style>
