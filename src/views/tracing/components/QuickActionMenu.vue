<template>
  <div>
    <button class="button no-top-border" data-dict-key="plot" v-on:click="heapViewChange">Plot</button>
    <button
      class="button no-top-border"
      data-dict-key="callStack"
      v-on:click="heapViewChange"
    >Call Stacks</button>
    <button class="button no-top-border" data-dict-key="leaks" v-on:click="heapViewChange">Leaks</button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const QuickActionMenu = Vue.extend({
  name: "QuickActionMenu",
  methods: {
    heapViewChange(evt: MouseEvent) {
      const target: HTMLElement = evt.target as HTMLElement;
      const buttonKey = target.dataset.dictKey;
      this.$emit("change", buttonKey);
    }
  }
});
export default QuickActionMenu;
</script>

<style lang="scss" scoped>
button{
    font-size: 12px;
}
</style>