<template>
  <div>
    <Header></Header>
    <PartitionTable @addNewRow="addNewRow" @save="save">
      <Row
        v-for="(row, i) in rows"
        @delete="DELETE(i)"
        :key="i"
        :encoding.sync="row.encoding"
        :rowError="row.error"
        :rowKey.sync="row.key"
        :rowValue.sync="row.value"
        :type.sync="row.type"
      />
    </PartitionTable>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "./components/Header.vue";
import PartitionTable from "./components/PartitionTable.vue";
import Row from "./components/Row.vue";
import { Action, Mutation, State } from "vuex-class";
import { NvsPartitionTable } from "./store";

@Component({
  components: {
    Header,
    PartitionTable,
    Row,
  },
})
export default class App extends Vue {
  @Action save;
  @Mutation ADD;
  @Mutation DELETE;
  @State("rows") private storeRows: NvsPartitionTable.IRow[];

  get rows() {
    return this.storeRows;
  }

  addNewRow() {
    this.ADD({
      key: "",
      type: "",
      encoding: "",
      value: "",
      error: "",
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

.checkbox:hover {
  color: var(--vscode-button-background);
}
</style>
