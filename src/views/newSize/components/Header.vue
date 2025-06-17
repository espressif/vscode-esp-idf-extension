<script setup lang="ts">
import { useNewSizeStore } from "../store";
import { IconSymbolEvent } from "@iconify-prerendered/vue-codicon";
const store = useNewSizeStore();
</script>

<template>
  <div class="settings-header">
    <div class="settings-header-content">
      <div class="settings-header-title">
        <h1 class="settings-title">
          <strong>ESP-IDF</strong>&nbsp;Size Analysis
        </h1>
        <button
          class="vscode-button"
          title="Flash"
          v-on:click="store.flashClicked"
          v-bind:disabled="store.isFlashing"
        >
          <span class="vscode-button-icon">
            <IconSymbolEvent />
          </span>
          <span>Flash</span>
        </button>
      </div>
      <p class="settings-description">
        Size analysis will provide users with in-depth analysis of the binary
        file generated from the project.
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-header {
  margin-bottom: 2rem;
}

.settings-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-settings-headerForeground);
}

.settings-description {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  margin: 0;
}

.vscode-button {
  height: 28px;
  padding: 0 12px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vscode-button:disabled:hover {
  background-color: var(--vscode-button-background);
}

.vscode-button-icon {
  display: flex;
  align-items: center;
}

.vscode-button-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
