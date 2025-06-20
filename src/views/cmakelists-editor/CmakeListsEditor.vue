<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useCMakeListsEditorStore } from "./store";
import CmakeListsElement from "./components/CMakeListsElement.vue";
import { IconClose } from "@iconify-prerendered/vue-codicon";

const store = useCMakeListsEditorStore();
let {
  emptyElements,
  fileName,
  selectedElementToAdd,
  textDictionary,
} = storeToRefs(store);

onMounted(() => {
  store.requestInitValues();
});

function getElementKey(title: string, index: number) {
  return `${title.replace(/\s/g, "_")}_${index}`;
}

function deleteElem(i: number) {
  store.elements.splice(i, 1);
}

function deleteElemError(i: number) {
  store.elements[i].hasError = false;
}
</script>

<template>
  <div class="cmake-editor">
    <div class="cmake-header">
      <h2 class="cmake-title">{{ textDictionary.title }}</h2>
      <h4 class="cmake-subtitle">{{ fileName }}</h4>
    </div>

    <div class="cmake-actions">
      <div class="cmake-add-group">
        <div class="cmake-select-group">
          <label class="settings-label">New Element</label>
          <select v-model="selectedElementToAdd" class="vscode-select">
            <option v-for="el in emptyElements" :value="el">
              {{ el.title }}
            </option>
          </select>
        </div>
        <button class="vscode-button" @click="store.addEmptyElement">
          {{ textDictionary.add }}
        </button>
      </div>

      <div class="cmake-buttons">
        <button class="vscode-button" @click="store.saveChanges">
          {{ textDictionary.save }}
        </button>
        <button class="vscode-button secondary" @click="store.requestInitValues">
          {{ textDictionary.discard }}
        </button>
      </div>
    </div>

    <div v-if="store.errors && store.errors.length" class="cmake-errors">
      <div
        v-for="(err, index) in store.errors"
        class="cmake-error"
      >
        <p class="cmake-error-message">{{ err }}</p>
        <button class="cmake-error-close" @click="store.errors.splice(index, 1)">
          <IconClose />
        </button>
      </div>
    </div>

    <div class="cmake-elements">
      <CmakeListsElement
        v-for="(elem, i) in store.elements"
        :key="getElementKey(elem.title, i)"
        :el="elem"
        @delete="deleteElem(i)"
        @clearError="deleteElemError(i)"
      ></CmakeListsElement>
    </div>
  </div>
</template>

<style lang="scss">
.cmake-editor {
  padding: 1rem;
  color: var(--vscode-editor-foreground);
}

.cmake-header {
  margin-bottom: 2rem;
  text-align: center;
}

.cmake-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin: 0 0 0.5rem 0;
}

.cmake-subtitle {
  font-size: 14px;
  color: var(--vscode-descriptionForeground);
  margin: 0;
}

.cmake-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.cmake-add-group {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.cmake-select-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cmake-buttons {
  display: flex;
  gap: 0.5rem;
}

.vscode-button {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 28px;
  color: var(--vscode-button-foreground);
  background-color: var(--vscode-button-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
}

.vscode-button.secondary {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  border-color: var(--vscode-button-secondaryBorder);
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button.secondary:hover {
  background-color: var(--vscode-button-secondaryHoverBackground);
}

.vscode-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
}

.vscode-select {
  height: 28px;
  padding: 0 8px;
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
}

.vscode-select:hover {
  border-color: var(--vscode-dropdown-border);
}

.vscode-select:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.cmake-errors {
  margin-bottom: 1rem;
}

.cmake-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: var(--vscode-errorForeground);
  color: var(--vscode-errorBackground);
  border-radius: 2px;
}

.cmake-error-message {
  margin: 0;
  font-size: 13px;
}

.cmake-error-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  margin: 0;
  cursor: pointer;
  color: var(--vscode-errorBackground);
  opacity: 0.8;
  border-radius: 2px;
}

.cmake-error-close:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.1);
}

.cmake-error-close :deep(svg) {
  width: 14px;
  height: 14px;
}

.cmake-elements {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
