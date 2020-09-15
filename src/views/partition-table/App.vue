<template>
  <div>
    <Header />
    <PartitionFileSelector @open="openNewFile" :path="path" />
    <PartitionTable @add="addEmptyRow" @save="save">
      <Row
        v-for="(row, i) in rows"
        :key="i"
        :name.sync="row.name"
        :type.sync="row.type"
        :subtype.sync="row.subtype"
        :offset.sync="row.offset"
        :size.sync="row.size"
        :flag.sync="row.flag"
        @delete="deleteRow(i)"
      />
    </PartitionTable>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";

import Header from "./components/Header.vue";
import PartitionFileSelector from "./components/PartitionFileSelector.vue";
import Row from "./components/Row.vue";
import PartitionTable from "./components/PartitionTable.vue";
import { Action, State } from "vuex-class";

@Component({
  components: {
    Header,
    PartitionFileSelector,
    Row,
    PartitionTable,
  },
})
export default class PartitionTableApp extends Vue {
  @State path;
  @State rows;
  @Action addRow;
  @Action deleteRow;
  @Action save;

  openNewFile(path: string) {
    console.log(path);
  }

  addEmptyRow() {
    this.addRow({
      name: "",
      type: "",
      subtype: "",
      offset: "",
      size: "",
      flag: "",
    });
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
.input,
.textarea,
.select select {
  border-color: var(--vscode-input-background);
}
</style>
