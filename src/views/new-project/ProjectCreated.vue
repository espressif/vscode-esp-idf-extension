<template>
  <div class="project-created-view">
    <h2>Project has been created!</h2>
    <p>Resulting path: {{ store.resultingProjectPath }}</p>
    <button @click="store.openResultingProject">Open Project</button>
  </div>
</template>

<script setup lang="ts">
import { useNewProjectStore } from "./store";
const store = useNewProjectStore();
</script>

<style scoped>
.project-created-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40px;
}
button {
  margin-top: 20px;
  padding: 8px 24px;
  font-size: 16px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: var(--vscode-button-hoverBackground);
}
</style>
