<script setup lang="ts">
import { storeToRefs } from "pinia";
import Header from "./components/Header.vue";
import PartitionTable from "./components/PartitionTable.vue";
import Row from "./components/Row.vue";
import { useNvsPartitionTableStore } from "./store";
import { findEncodingTypes } from "./util";

const store = useNvsPartitionTableStore();

const { rows } = storeToRefs(store);

function addNewRow() {
  store.rows.push({
    key: "",
    type: "",
    encoding: "",
    value: "",
    error: "",
  });
}

function updateEncoding(index: string, newType: string) {
    const encodingTypes = findEncodingTypes(newType);
    if (newType === "namespace") {
      store.rows[index].encoding = "";
    } else if (encodingTypes.indexOf(newType) === -1) {
      store.rows[index].encoding = encodingTypes[0];
    }
  }
</script>

<template>
  <div>
    <Header></Header>
    <PartitionTable @addNewRow="addNewRow" @save="store.save">
      <Row
        v-for="(row, i) in rows"
        @delete="rows.splice(i, 1)"
        :key="i"
        :encoding.sync="row.encoding"
        :rowError="row.error"
        :rowKey.sync="row.key"
        :rowValue.sync="row.value"
        :rowType.sync="row.type"
        :updateEncoding="updateEncoding"
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
