<script setup lang="ts">
import IdfComponent from "./IdfComponent.vue";
import { useNewProjectStore } from "../store";
import { storeToRefs } from "pinia";
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";
const store = useNewProjectStore();

let {
  currentComponentPath,
  components,
} = storeToRefs(store);

let folderIcon = "folder";

function addToComponentList() {
    if (this.storeCurrentComponentPath.trim() != "") {
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
          <div class="icon is-large is-size-4" style="text-decoration: none;">
            <iconify-icon
              :icon="folderIcon"
              @mouseover="folderIcon = 'folder-opened'"
              @mouseout="folderIcon = 'folder'"
              v-on:click="store.openComponentFolder"
            />
          </div>
        </div>
        <div class="control add-icon">
          <div class="icon is-large is-size-4">
            <iconify-icon icon="add" @click="addToComponentList" />
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