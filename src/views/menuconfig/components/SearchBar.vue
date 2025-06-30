<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useMenuconfigStore } from '../store';

const store = useMenuconfigStore();

const { searchString, textDictionary } = storeToRefs(store);

</script>

<template>
  <div class="search-container">
    <div class="search-wrapper">
      <input
        v-model="searchString"
        type="search"
        name="search"
        placeholder="Search parameter"
        autocomplete="off"
        class="search-input"
      />
    </div>
    <div class="button-group">
      <button class="vscode-button" @click="store.saveGuiConfig" id="searchbar-save">
        {{ textDictionary.save }}
      </button>
      <button class="vscode-button" @click="store.resetGuiConfig">
        {{ textDictionary.discard }}
      </button>
      <button class="vscode-button" @click="store.setDefaultConfig">
        {{ textDictionary.reset }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 8px;
  width: 100%;
  justify-content: center;
}

.search-wrapper {
  flex: 1;
  max-width: 600px;
}

.search-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  font-size: 14px;
  line-height: 32px;
  color: var(--vscode-input-foreground);
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  outline: none;
  transition: border-color 0.1s ease-in-out;
}

.search-input:focus {
  border-color: var(--vscode-textLink-activeForeground);
  outline: 1px solid var(--vscode-textLink-activeForeground);
  outline-offset: -1px;
}

.search-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.button-group {
  display: flex;
  gap: 8px;
}

.vscode-button {
  height: 24px;
  padding: 0 10px;
  font-size: 13px;
  line-height: 24px;
  color: var(--vscode-button-foreground);
  background-color: var(--vscode-button-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}
</style>