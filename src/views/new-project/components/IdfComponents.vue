<script setup lang="ts">
import IdfComponent from "./IdfComponent.vue";
import { useNewProjectStore } from "../store";
import { storeToRefs } from "pinia";
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";
import {
  IconAdd,
  IconFolder,
  IconFolderOpened,
} from "@iconify-prerendered/vue-codicon";
import { ref } from "vue";
const store = useNewProjectStore();

let { currentComponentPath, components } = storeToRefs(store);

let folderIcon = ref("folder");

function addToComponentList() {
  if (currentComponentPath.value.trim() != "") {
    const component: IComponent = {
      name: currentComponentPath.value,
      path: currentComponentPath.value,
    };
    store.components.push(component);
    store.currentComponentPath = "";
  }
}
</script>

<template>
  <div class="settings-item">
    <label class="settings-label">Add your ESP-IDF Component directory</label>
    <div class="settings-control">
      <div class="component-input-group">
        <input
          type="text"
          class="vscode-input"
          v-model="currentComponentPath"
          @keyup.enter="addToComponentList"
          placeholder="Enter component path"
        />
        <button
          class="component-button"
          @mouseover="folderIcon = 'folder-opened'"
          @mouseout="folderIcon = 'folder'"
          @click="store.openComponentFolder"
        >
          <IconFolderOpened v-if="(folderIcon === 'folder-opened')" />
          <IconFolder v-if="(folderIcon === 'folder')" />
        </button>
        <button
          class="component-button"
          @click="addToComponentList"
        >
          <IconAdd />
        </button>
      </div>
    </div>
    <div class="components-list">
      <IdfComponent
        v-for="(idfComp, index) in components"
        :comp="idfComp"
        :key="idfComp.name"
        :removeComponent="(comp) => components.splice(index, 1)"
      />
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

.component-input-group {
  display: flex;
  align-items: center;
  width: 100%;
}

.component-button {
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

.component-button :deep(svg) {
  width: 16px;
  height: 16px;
}

.component-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.component-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.component-button:focus {
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

.component-button:last-child {
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}

.components-list {
  margin-top: 1rem;
}
</style>
