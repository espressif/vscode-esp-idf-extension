<script setup lang="ts">
const emits = defineEmits(["change"]);
function heapViewChange(evt: MouseEvent) {
  const target: HTMLElement = evt.target as HTMLElement;
  const buttonKey = target.dataset.dictKey;
  emits("change", buttonKey);
}
</script>

<template>
  <div>
    <button
      class="button no-bottom-border"
      data-dict-key="plot"
      v-on:click="heapViewChange"
    >
      Visual Data
    </button>
    <button
      class="button no-bottom-border"
      data-dict-key="stats"
      v-on:click="heapViewChange"
    >
      Overall Stats
    </button>
    <button
      class="button no-bottom-border"
      data-dict-key="callStack"
      v-on:click="heapViewChange"
    >
      Totals
    </button>
    <button
      class="button no-bottom-border"
      data-dict-key="leaks"
      v-on:click="heapViewChange"
    >
      Leaks
    </button>
  </div>
</template>

<style lang="scss" scoped>
button {
  font-size: 12px;
}
</style>
