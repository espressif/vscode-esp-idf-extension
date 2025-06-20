<script setup lang="ts">
import { onMounted } from "vue";
import { usePartitionTableStore } from "../store";
import {
  IconStarEmpty,
  IconSymbolEvent,
  IconRefresh,
  IconTools,
} from "@iconify-prerendered/vue-codicon";

const store = usePartitionTableStore();

onMounted(() => {
  store.initDataRequest();
});
</script>

<template>
  <div class="settings-header">
    <div class="settings-header-content">
      <div class="settings-header-title">
        <h1 class="settings-title">
          <strong>ESP-IDF </strong>
          <span>Partition Table Editor</span>
        </h1>
        <div class="settings-header-actions">
          <a class="vscode-button" href="command:espIdf.selectFlashMethodAndFlash">
            <span class="vscode-button-icon">
              <IconStarEmpty />
            </span>
            <span>Select Flash Method</span>
          </a>
          <a class="vscode-button" href="command:espIdf.buildDevice">
            <span class="vscode-button-icon">
              <IconTools />
            </span>
            <span>Build</span>
          </a>
          <a class="vscode-button" href="command:espIdf.flashDevice">
            <span class="vscode-button-icon">
              <IconSymbolEvent />
            </span>
            <span>Flash</span>
          </a>
          <button
            class="vscode-button"
            title="Reset values"
            @click="store.initDataRequest"
          >
            <span class="vscode-button-icon">
              <IconRefresh />
            </span>
          </button>
        </div>
      </div>
      <p class="settings-description">
        Partition Editor can help you to easily edit, build &amp; flash
        partition table through GUI, without interacting directly with the csv
        files.
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

.settings-header-actions {
  display: flex;
  gap: 0.5rem;
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
  text-decoration: none;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
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
