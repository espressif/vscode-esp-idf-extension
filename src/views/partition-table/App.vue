<template>
  <div>
    <Header />
    <PartitionFileSelector @open="openNewFile" :path="path" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";

import Header from "./components/Header.vue";
import PartitionFileSelector from "./components/PartitionFileSelector.vue";

@Component({
  components: {
    Header,
    PartitionFileSelector,
  },
})
export default class PartitionTableApp extends Vue {
  private path = "esp/a/b/c";
  openNewFile(path: string) {
    console.log(path);
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
</style>
