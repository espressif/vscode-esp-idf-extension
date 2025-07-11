<script setup lang="ts">
import { IconFolder, IconFolderOpened } from "@iconify-prerendered/vue-codicon";
import { computed, ref } from "vue";
let folderIcon = ref("folder");

const props = defineProps<{
  keyEnterMethod?: () => void;
  openMethod: () => void;
  propLabel: string;
  propModel: string;
  propMutate: (val: string) => void;
  staticText: string;
  id: string;
}>();

const dataModel = computed({
  get() {
    return props.propModel;
  },
  set(newVal: string) {
    props.propMutate(newVal);
  },
});

const pathSep = navigator.platform.indexOf("Win") >= 0 ? "\\" : "/";
function onKeyEnter() {
  if (props.keyEnterMethod) {
    props.keyEnterMethod();
  }
}
</script>

<template>
  <div class="settings-item">
    <label class="settings-label">{{ props.propLabel }}</label>
    <div class="settings-control">
      <div class="folder-input-group">
        <input
          type="text"
          class="vscode-input"
          v-model="dataModel"
          @keyup.enter="onKeyEnter"
          :id="props.id"
        />
        <div class="folder-input-suffix" v-if="props.staticText">
          <span class="static-text">{{ pathSep + props.staticText }}</span>
        </div>
        <button
          class="folder-button"
          @mouseover="folderIcon = 'folder-opened'"
          @mouseout="folderIcon = 'folder'"
          @click="props.openMethod"
        >
          <IconFolderOpened v-if="(folderIcon === 'folder-opened')" />
          <IconFolder v-if="(folderIcon === 'folder')" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-input-group {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 600px;
}

.folder-input-suffix {
  padding: 0 8px;
  height: 32px;
  display: flex;
  align-items: center;
  background-color: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-left: none;
  color: var(--vscode-input-foreground);
  font-size: 13px;
  line-height: 32px;
}

.folder-input-suffix .static-text {
  font-size: 13px;
  line-height: 1.4;
}

.folder-button {
  height: 32px;
  width: 32px;
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

.folder-button :deep(svg) {
  width: 16px;
  height: 16px;
}

.folder-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.folder-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.folder-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  height: 32px;
  line-height: 32px;
  font-size: 13px;
}

.folder-input-suffix {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.folder-button {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
</style>
