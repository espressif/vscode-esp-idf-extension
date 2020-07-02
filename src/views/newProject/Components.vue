<template>
  <div id="components">
    <label>Enter ESP-IDF Component directory</label>
    <br />
    <br />
    <input type="text" class="text-size" v-model="currentComponentPath" />
    <font-awesome-icon
      icon="plus-square"
      class="fa-icon"
      @click="addToComponentList"
    />
    <font-awesome-icon
      :icon="folderIcon"
      class="fa-icon"
      @mouseover="folderIcon = 'folder-open'"
      @mouseout="folderIcon = 'folder'"
      @click="openComponentFolder"
    />
    <br />
    <br />
    <idfComponent
      v-for="idfComp in components"
      :comp.sync="idfComp"
      :key="idfComp.name"
    />
    <br />
    <router-link to="/project-location" class="button"
      >Choose project directory</router-link
    >
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IComponent } from "../../espIdf/idfComponent/IdfComponent";

@Component
export default class Components extends Vue {
  public folderIcon = "folder";
  @Action private openComponentFolder;
  @Mutation private addComponent;
  @State("components") private storeComponents: IComponent[];
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
.fa-icon {
  color: var(--vscode-editor-foreground);
  position: inherit;
  width: 15px;
  height: 15px;
  margin-left: 5px;
  top: 50%;
  cursor: default;
}
.fa-icon:hover {
  background: var(--vscode-button-hoverBackground);
}
.text-size {
  width: 60%;
}
</style>
