<script setup lang="ts">
import { useSizeStore } from "../store";

const store = useSizeStore();

function toggleOverviewAndDetails() {
  store.isOverviewEnabled = !store.isOverviewEnabled;
}
</script>

<template>
  <div class="settings-filter">
    <div class="settings-filter-buttons">
      <button
        class="settings-filter-button"
        v-on:click="toggleOverviewAndDetails"
        v-bind:class="{ 'settings-filter-button-active': store.isOverviewEnabled }"
      >
        Overview
      </button>
      <button
        class="settings-filter-button"
        v-on:click="toggleOverviewAndDetails"
        v-bind:class="{ 'settings-filter-button-active': !store.isOverviewEnabled }"
      >
        Detailed
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-filter {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
}

.settings-filter-buttons {
  display: flex;
  gap: 1px;
  background-color: var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
  overflow: hidden;
}

.settings-filter-button {
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

.settings-filter-button:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.settings-filter-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
  z-index: 1;
}

.settings-filter-button-active {
  background-color: var(--vscode-tab-activeBackground);
  color: var(--vscode-tab-activeForeground);
  font-weight: 600;
}
</style>
