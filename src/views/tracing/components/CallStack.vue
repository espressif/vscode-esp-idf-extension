<template>
  <div class="call-stack-container">
    <div class="columns">
      <div class="column is-2">Bytes Used</div>
      <div class="column is-2">Count</div>
      <div class="column">Function Name</div>
    </div>
    <div v-for="(calls, index) in callstack" :key="index">
      <calls v-bind:tree="createTreeFromAddressArray(calls)" :index="index" :space="1"></calls>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const CallStack = Vue.extend({
  name: "CallStack",
  props: {
    callstack: Array
  },
  methods: {
    createTreeFromAddressArray(addr: string[]): any {
      const root = this.$root as any;
      return root.createTreeFromAddressArray(addr);
    }
  }
});
export default CallStack;
</script>

<style lang="scss" scoped>
.call-stack-container{
  overflow: auto;
  height: calc(45vh);
}
.columns{
  margin: 0 auto;
  border-bottom-width: 2px;
  border-bottom-style: solid;
  border-bottom-color: var(--vscode-foreground);
}
</style>