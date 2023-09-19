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
  <div id="components">
    <div class="field">
      <label class="label">Add your ESP-IDF Component directory</label>
      <div class="field has-addons">
        <div class="control expanded">
          <input
            type="text"
            class="input"
            v-model="currentComponentPath"
            @keyup.enter="addToComponentList"
          />
        </div>
        <div class="control">
          <div
            class="icon is-large is-size-4"
            style="text-decoration: none;"
            @mouseover="folderIcon = 'folder-opened'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="store.openComponentFolder"
          >
            <IconFolderOpened v-if="(folderIcon === 'folder-opened')" />
            <IconFolder v-if="(folderIcon === 'folder')" />
          </div>
        </div>
        <div class="control add-icon">
          <div class="icon is-large is-size-4">
            <IconAdd @click="addToComponentList" />
          </div>
        </div>
      </div>
    </div>
    <IdfComponent
      v-for="(idfComp, index) in components"
      :comp="idfComp"
      :key="idfComp.name"
      :removeComponent="(comp) => components.splice(index, 1)"
    />
  </div>
</template>

<style scoped>
#components {
  width: 100%;
}
.add-icon .icon svg:hover {
  filter: url(#blur-filter);
  stroke: var(--vscode-input-foreground);
}
</style>
