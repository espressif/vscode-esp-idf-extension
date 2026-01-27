<template>
  <div class="project-created-view">
    <div v-if="!resultingProjectPath" class="loading-state">
      <IconLoading class="gear" />
      <h2>Creating project...</h2>
    </div>
    <div v-else class="success-state">
      <h2>Project has been created!</h2>
      <p>Resulting path: {{ resultingProjectPath }}</p>
      <button @click="store.openResultingProject">Open Project</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNewProjectStore } from "./store";
import { storeToRefs } from "pinia";
import { IconLoading } from "@iconify-prerendered/vue-codicon";

const store = useNewProjectStore();
const { resultingProjectPath } = storeToRefs(store);
</script>

<style scoped>
.project-created-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40px;
}

.loading-state,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.gear {
  animation-name: rotateFrames;
  animation-duration: 5s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  transform-origin: 50% 50%;
  display: inline-block;
  font-size: 32px;
  color: var(--vscode-button-background);
}

@keyframes rotateFrames {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
