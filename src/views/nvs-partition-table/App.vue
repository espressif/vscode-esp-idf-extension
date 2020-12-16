<template>
  <div>
    <Header></Header>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "./components/Header.vue";
// import PartitionTable from "./components/PartitionTable.vue";
// import Row from "./components/Row.vue";

@Component({
  components: {
    Header,
  },
})
export default class App extends Vue {
  private msg = "Hello";
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
.input,
.textarea,
.select select {
  border-color: var(--vscode-input-background);
}

.checkbox:hover {
  color: var(--vscode-button-background);
}
</style>
