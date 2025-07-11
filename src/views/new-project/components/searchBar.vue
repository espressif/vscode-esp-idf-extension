<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewProjectStore } from "../store";

const store = useNewProjectStore();

const { searchString } = storeToRefs(store);
</script>

<template>
  <div class="search-container">
    <div class="search-wrapper">
      <input
        v-model="searchString"
        type="search"
        name="search"
        placeholder="Search Template By Name"
        autocomplete="off"
        class="search-input"
      />
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
</style>
