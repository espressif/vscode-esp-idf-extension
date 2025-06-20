<script setup lang="ts">
import { IconAdd, IconClose  } from "@iconify-prerendered/vue-codicon";
import { Ref, ref } from "vue";

const props = defineProps<{
  title: string;
  elements: { [key: string]: string };
}>();

let valueToPush: Ref<string> = ref("");

function removeElement(dictKey: string) {
  delete props.elements[dictKey];
}

function addToDictionary() {
  if (valueToPush.value != "") {
    props.elements[valueToPush.value] = "";
    valueToPush.value = "";
  }
}
</script>

<template>
  <div class="settings-item">
    <label class="settings-label">{{ title }}</label>
    <div class="settings-control">
      <div class="dictionary-items">
        <div
          v-for="confKey in Object.keys(elements)"
          :key="confKey"
          class="dictionary-item"
        >
          <div class="dictionary-item-content">
            <label :for="elements[confKey]" class="dictionary-key">
              {{ confKey }}:
            </label>
            <input
              type="text"
              v-model="elements[confKey]"
              class="vscode-input"
            />
          </div>
          <button class="dictionary-remove" @click="removeElement(confKey)">
            <IconClose />
          </button>
        </div>
      </div>
      <div class="dictionary-input-group">
        <input
          type="text"
          v-model="valueToPush"
          class="vscode-input"
          @keyup.enter="addToDictionary"
          placeholder="Enter key name"
        />
        <button class="dictionary-button" @click="addToDictionary">
          <IconAdd />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-item {
  margin-bottom: 1.5rem;
}

.settings-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin-bottom: 0.5rem;
}

.settings-control {
  width: 100%;
  max-width: 600px;
}

.dictionary-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.dictionary-item {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 2px;
  background-color: var(--vscode-editor-inactiveSelectionBackground);
}

.dictionary-item-content {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
}

.dictionary-key {
  font-size: 13px;
  color: var(--vscode-editor-foreground);
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.dictionary-remove {
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

.dictionary-remove:hover {
  opacity: 1;
  background-color: var(--vscode-button-hoverBackground);
}

.dictionary-remove :deep(svg) {
  width: 14px;
  height: 14px;
}

.dictionary-input-group {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.vscode-input {
  flex: 1;
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

.vscode-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.dictionary-button {
  height: 28px;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vscode-button-background);
  border: 1px solid var(--vscode-button-border);
  border-left: none;
  color: var(--vscode-button-foreground);
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.dictionary-button :deep(svg) {
  width: 14px;
  height: 14px;
}

.dictionary-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.dictionary-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.dictionary-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.dictionary-button {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
</style>
