<script setup lang="ts">
import { computed, ref } from "vue";
import { IconFolder, IconFolderOpened } from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  title: string;
  value: string;
  updateMethod: (sections: string[], newValue: any) => void;
  sections: string[];
  openMethod?: (sections: string[]) => void;
}>();
let folderIcon = ref("folder");

let stringValue = computed({
  get() {
    return props.value;
  },
  set(newVal: any) {
    props.updateMethod(props.sections, newVal);
  },
});
</script>

<template>
  <div class="settings-item">
    <label :for="value" class="settings-label">{{ title }}</label>
    <div class="settings-control">
      <div class="string-input-group">
        <input
          type="text"
          :id="value"
          v-model="stringValue"
          class="vscode-input"
        />
        <button
          v-if="openMethod"
          class="string-button"
          @mouseover="folderIcon = 'folder-opened'"
          @mouseout="folderIcon = 'folder'"
          @click="openMethod(sections)"
        >
          <IconFolderOpened v-if="(folderIcon === 'folder-opened')" />
          <IconFolder v-if="(folderIcon === 'folder')" />
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

.string-input-group {
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

.string-button {
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

.string-button :deep(svg) {
  width: 14px;
  height: 14px;
}

.string-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.string-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.string-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.string-button {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
</style>
