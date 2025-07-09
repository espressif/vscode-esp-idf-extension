<script setup lang="ts">
import { IconClose } from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  error: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div v-if="props.visible" class="error-dialog-overlay" @click="emit('close')">
    <div class="error-dialog" @click.stop>
      <div class="error-dialog-header">
        <h3>Error Details</h3>
        <button class="close-button" @click="emit('close')" title="Close">
          <IconClose />
        </button>
      </div>
      <div class="error-dialog-content">
        <p>{{ props.error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-dialog {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.error-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background-color: var(--vscode-editor-background);
}

.error-dialog-header h3 {
  margin: 0;
  color: var(--vscode-errorForeground);
  font-size: 16px;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: 4px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.close-button :deep(svg) {
  width: 16px;
  height: 16px;
}

.error-dialog-content {
  padding: 20px;
  color: var(--vscode-foreground);
  font-size: 13px;
  line-height: 1.5;
  overflow-y: auto;
  max-height: 60vh;
}

.error-dialog-content p {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style> 