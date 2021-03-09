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
              v-on:click="openComponentFolder"
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
      v-for="idfComp in components"
      :comp="idfComp"
      :key="idfComp.name"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import folderOpen from "./folderOpen.vue";
import IdfComponent from "./IdfComponent.vue";
import { IComponent } from "../../../espIdf/idfComponent/IdfComponent";

@Component({
  components: {
    folderOpen,
    IdfComponent,
  },
})
export default class Components extends Vue {
  public folderIcon = "folder";
  @Action private openComponentFolder;
  @Mutation private addComponent;
  @State("components") private storeComponents: IdfComponent[];
  @State("currentComponentPath") private storeCurrentComponentPath: string;
  @Mutation private setCurrentComponentPath;

  get components() {
    return this.storeComponents;
  }

  get currentComponentPath() {
    return this.storeCurrentComponentPath;
  }

  set currentComponentPath(newPath: string) {
    this.setCurrentComponentPath(newPath);
  }

  private addToComponentList() {
    if (this.storeCurrentComponentPath.trim() != "") {
      const component: IComponent = {
        name: this.storeCurrentComponentPath,
        path: this.storeCurrentComponentPath,
      };
      this.addComponent(component);
      this.setCurrentComponentPath("");
    }
  }
}
</script>

<style scoped>
#components {
  width: 100%;
}
.add-icon .icon svg:hover {
  filter: url(#blur-filter);
  stroke: var(--vscode-input-foreground);
}
</style>
