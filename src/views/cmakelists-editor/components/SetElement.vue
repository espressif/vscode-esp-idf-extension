<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";
import { IconClose } from "@iconify-prerendered/vue-codicon";

const emit = defineEmits(["clearError", "delete"]);
defineProps<{
  el: CmakeListsElement;
}>();
function del() {
  emit("delete");
}
function clearError() {
  emit("clearError");
}
</script>

<template>
  <div class="settings-item" :class="{ 'settings-item-error': el.hasError }">
    <div class="settings-header">
      <label :for="el.title" class="settings-label">{{ el.title }}</label>
      <button class="settings-delete" @click="del">
        <IconClose />
      </button>
    </div>

    <div class="settings-control">
      <div class="settings-row">
        <div class="settings-field">
          <label class="settings-field-label">Variable</label>
          <input
            type="text"
            v-model="el.variable"
            class="vscode-input"
            @input="clearError"
          />
        </div>

        <div class="settings-field">
          <label class="settings-field-label">Value</label>
          <input
            type="text"
            v-model="el.value"
            class="vscode-input"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-item {
  margin-bottom: 1.5rem;
}

.settings-item-error {
  border: 1px solid var(--vscode-errorForeground);
  border-radius: 2px;
  padding: 1rem;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
}

.settings-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  margin: 0;
  cursor: pointer;
  color: var(--vscode-editor-foreground);
  opacity: 0.8;
  border-radius: 2px;
}

.settings-delete:hover {
  opacity: 1;
  background-color: var(--vscode-button-hoverBackground);
}

.settings-delete :deep(svg) {
  width: 14px;
  height: 14px;
}

.settings-control {
  width: 100%;
  max-width: 600px;
}

.settings-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.settings-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-field-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.vscode-input {
  height: 20px;
  padding: 4px 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.vscode-input:hover {
  border-color: var(--vscode-input-border);
}

.vscode-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}
</style>
