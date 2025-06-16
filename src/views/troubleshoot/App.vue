<script setup lang="ts">
import { useTroubleShootingStore } from "./store";
import { storeToRefs } from "pinia";

const store = useTroubleShootingStore();

const { title, stepsToReproduce, description } = storeToRefs(store);
</script>

<template>
  <div class="troubleshoot-container">
    <div class="troubleshoot-header">
      <h1 class="troubleshoot-title">ESP-IDF Extension Troubleshooting Report</h1>
    </div>
    <div class="troubleshoot-content">
      <form @submit.prevent="store.sendForm" class="troubleshoot-form">
        <div class="settings-item">
          <label class="settings-label" for="title">Title</label>
          <div class="settings-control">
            <input
              v-model="title"
              id="title"
              type="text"
              class="vscode-input"
              required
              placeholder="Enter a title for your issue"
            />
          </div>
        </div>

        <div class="settings-item">
          <label class="settings-label" for="steps">Steps to Reproduce</label>
          <div class="settings-description">
            Please provide clear and concise steps to reproduce the issue
          </div>
          <div class="settings-control">
            <textarea
              v-model="stepsToReproduce"
              id="steps"
              required
              class="vscode-textarea"
              placeholder="1. First step&#10;2. Second step&#10;3. ..."
              rows="4"
            ></textarea>
          </div>
        </div>

        <div class="settings-item">
          <label class="settings-label" for="description">Description</label>
          <div class="settings-description">
            Please provide any additional details about the issue
          </div>
          <div class="settings-control">
            <textarea
              v-model="description"
              id="description"
              required
              class="vscode-textarea"
              placeholder="Describe the issue in detail..."
              rows="6"
            ></textarea>
          </div>
        </div>

        <div class="settings-item settings-actions">
          <button type="submit" class="vscode-button">Submit Report</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.troubleshoot-container {
  padding: 1rem;
  color: var(--vscode-editor-foreground);
}

.troubleshoot-header {
  margin-bottom: 2rem;
  text-align: center;
}

.troubleshoot-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin: 0;
}

.troubleshoot-content {
  max-width: 800px;
  margin: 0 auto;
}

.troubleshoot-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.settings-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 0.5rem;
}

.settings-control {
  width: 100%;
  max-width: 600px;
}

.vscode-input,
.vscode-textarea {
  width: 100%;
  padding: 4px 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.vscode-textarea {
  resize: none;
  min-height: 80px;
}

.vscode-input:hover,
.vscode-textarea:hover {
  border-color: var(--vscode-input-border);
}

.vscode-input:focus,
.vscode-textarea:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input::placeholder,
.vscode-textarea::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.vscode-button {
  height: 32px;
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

.settings-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
