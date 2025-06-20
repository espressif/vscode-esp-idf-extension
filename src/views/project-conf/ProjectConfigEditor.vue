<script setup lang="ts">
import { onMounted, ref, Ref } from "vue";
import { useProjectConfStore } from "./store";
import projectConfElem from "./components/projectConfElem.vue";

const store = useProjectConfStore();

let keyToAdd: Ref<string> = ref("");
function addElement() {
  if (keyToAdd.value !== "") {
    store.addNewConfigToList(keyToAdd.value);
    keyToAdd.value = "";
  }
}

function deleteElem(elKey: string) {
  delete store.elements[elKey];
}

onMounted(() => {
  store.requestInitValues();
})
</script>

<template>
  <div class="config-editor">
    <div class="config-header">
      <h2 class="config-title">{{ store.textDictionary.title }}</h2>
    </div>

    <div class="config-actions">
      <div class="config-buttons">
        <button class="vscode-button" @click="store.saveChanges">
          {{ store.textDictionary.save }}
        </button>
        <button class="vscode-button secondary" @click="store.requestInitValues">
          {{ store.textDictionary.discard }}
        </button>
      </div>
    </div>

    <div class="settings-item">
      <div class="settings-control">
        <div class="add-config-group">
          <label :for="keyToAdd" class="settings-label">
            Enter new profile configuration name
          </label>
          <div class="add-config-input-group">
            <input
              type="text"
              v-model="keyToAdd"
              class="vscode-input"
              @keyup.enter="addElement"
              placeholder="Enter configuration name"
            />
            <button class="vscode-button" @click="addElement">
              {{ store.textDictionary.add }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="config-elements">
      <projectConfElem
        v-for="confKey in Object.keys(store.elements).reverse()"
        :key="confKey"
        :el.sync="store.elements[confKey]"
        :title="confKey"
        @delete="deleteElem(confKey)"
      ></projectConfElem>
    </div>
  </div>
</template>

<style lang="scss">
.config-editor {
  padding: 1rem;
  color: var(--vscode-editor-foreground);
}

.config-header {
  margin-bottom: 2rem;
  text-align: center;
}

.config-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin: 0;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

.config-buttons {
  display: flex;
  gap: 0.5rem;
}

.vscode-button {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 32px;
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

.add-config-group {
  background-color: var(--vscode-editor-background);
  border: 2px solid var(--vscode-panel-border);
  padding: 1rem;
  border-radius: 2px;
}

.add-config-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.config-elements {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
