<script setup lang="ts">
const emits = defineEmits(["change"]);
function heapViewChange(evt: MouseEvent) {
  const target: HTMLElement = evt.target as HTMLElement;
  const buttonKey = target.dataset.dictKey;
  emits("change", buttonKey);
}
</script>

<template>
  <div class="settings-tabs">
    <button
      class="settings-tab"
      data-dict-key="plot"
      v-on:click="heapViewChange"
    >
      Visual Data
    </button>
    <button
      class="settings-tab"
      data-dict-key="stats"
      v-on:click="heapViewChange"
    >
      Overall Stats
    </button>
    <button
      class="settings-tab"
      data-dict-key="callStack"
      v-on:click="heapViewChange"
    >
      Totals
    </button>
    <button
      class="settings-tab"
      data-dict-key="leaks"
      v-on:click="heapViewChange"
    >
      Leaks
    </button>
  </div>
</template>

<style lang="scss" scoped>
.settings-tabs {
  display: flex;
  gap: 1px;
  background-color: var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
  overflow: hidden;
}

.settings-tab {
  flex: 1;
  height: 28px;
  padding: 0 12px;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border: none;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.1s ease;
}

.settings-tab:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.settings-tab:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
  z-index: 1;
}

.settings-tab[aria-selected="true"] {
  background-color: var(--vscode-tab-activeBackground);
  color: var(--vscode-tab-activeForeground);
  font-weight: 600;
}
</style>
