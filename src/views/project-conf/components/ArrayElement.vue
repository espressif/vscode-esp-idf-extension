<script setup lang="ts">
import { IconAdd, IconClose } from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  title: string;
  values: string[];
  addValue: (sections: string[], val: string) => void;
  removeValue: (sections: string[], i: number) => void;
  sections: string[];
}>();

let valueToPush = "";

function addToArray() {
  if (valueToPush !== "") {
    props.addValue(props.sections, valueToPush);
    valueToPush = "";
  }
}

function removeFromArray(val: any) {
  const index = props.values.indexOf(val);
  props.removeValue(props.sections, index);
}
</script>

<template>
  <div class="settings-item">
    <label class="settings-label">{{ title }}</label>
    <div class="settings-control">
      <div class="array-tags">
        <div v-for="v in values" :key="v" class="array-tag">
          <span class="array-tag-text">{{ v }}</span>
          <button class="array-tag-remove" @click="removeFromArray(v)">
            <IconClose />
          </button>
        </div>
      </div>
      <div class="array-input-group">
        <input
          type="text"
          v-model="valueToPush"
          class="vscode-input"
          @keyup.enter="addToArray"
          placeholder="Add new value"
        />
        <button class="array-button" @click="addToArray">
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

.array-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.array-tag {
  display: inline-flex;
  align-items: center;
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 2px;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1.4;
}

.array-tag-text {
  margin-right: 4px;
}

.array-tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: var(--vscode-badge-foreground);
  opacity: 0.8;
}

.array-tag-remove:hover {
  opacity: 1;
}

.array-tag-remove :deep(svg) {
  width: 14px;
  height: 14px;
}

.array-input-group {
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

.array-button {
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

.array-button :deep(svg) {
  width: 14px;
  height: 14px;
}

.array-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.array-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.array-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.array-button {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
</style>
