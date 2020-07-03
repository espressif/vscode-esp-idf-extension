<template>
  <div id="components">
    <p class="title">Components for your ESP-IDF project</p>
    <div class="field">
      <label class="label">Add your ESP-IDF Component directory</label>
      <div class="field is-grouped" style="align-items: center;">
        <div class="control is-expanded">
          <input
            type="text"
            class="input"
            v-model="currentComponentPath"
            @keyup.enter="addToComponentList"
          />
        </div>
        <div class="control">
          <font-awesome-icon
            icon="plus-square"
            class="fa-icon"
            @click="addToComponentList"
          />
        </div>
        <div class="control">
          <font-awesome-icon
            :icon="folderIcon"
            class="fa-icon"
            @mouseover="folderIcon = 'folder-open'"
            @mouseout="folderIcon = 'folder'"
            @click="openComponentFolder"
          />
        </div>
      </div>
    </div>
    <idfComponent
      v-for="idfComp in components"
      :comp.sync="idfComp"
      :key="idfComp.name"
    />
    <br />
    <div class="field is-grouped is-grouped-centered">
      <div class="control">
        <router-link to="/project-location" class="button"
          >Choose project directory</router-link
        >
      </div>
    </div>
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

<style>
#components {
  width: 50%;
}
</style>
