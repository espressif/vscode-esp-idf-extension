<template>
  <div>
    <Header />
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
        :error="row.error"
        @delete="deleteRow(i)"
      />
    </PartitionTable>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";

import Header from "./components/Header.vue";
import Row from "./components/Row.vue";
import PartitionTable from "./components/PartitionTable.vue";
import { Action, State } from "vuex-class";

@Component({
  components: {
    Header,
    Row,
    PartitionTable,
  },
})
export default class PartitionTableApp extends Vue {
  @State rows;
  @Action addRow;
  @Action deleteRow;
  @Action save;

  addEmptyRow() {
    this.addRow({
      name: "",
      type: "",
      subtype: "",
      offset: "",
      size: "",
      flag: false,
    });
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
@import "~@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css";
.input,
.textarea,
.select select {
  border-color: var(--vscode-input-background);
}
</style>
