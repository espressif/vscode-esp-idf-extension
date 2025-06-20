<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";
import { IconAdd, IconClose } from "@iconify-prerendered/vue-codicon"; 

let elementValueToPush = "";
const props = defineProps<{
  el: CmakeListsElement;
}>();
function removeFromArray(value) {
  const index = props.el.value.indexOf(value);
  props.el.value.splice(index, 1);
}

function addToArray() {
  if (!!elementValueToPush) {
    props.el.value.push(elementValueToPush);
    elementValueToPush = "";
  }
}
const emit = defineEmits(["delete"]);

function del() {
  emit("delete");
}

</script>

<template>
  <div class="settings-item">
    <div class="settings-header">
      <label :for="el.title" class="settings-label">{{ el.title }}</label>
      <button class="settings-delete" @click="del">
        <IconClose />
      </button>
    </div>

    <div class="settings-control">
      <div class="array-tags">
        <div v-for="v in el.value" :key="v" class="array-tag">
          <span class="array-tag-text">{{ v }}</span>
          <button class="array-tag-remove" @click="removeFromArray(v)">
            <IconClose />
          </button>
        </div>
      </div>

      <div class="array-input-group">
        <input
          type="text"
          v-model="elementValueToPush"
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

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
}

.settings-delete {
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

.settings-delete:hover {
  opacity: 1;
  background-color: var(--vscode-button-hoverBackground);
}

.settings-delete :deep(svg) {
  width: 14px;
  height: 14px;
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
