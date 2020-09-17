<template>
  <div id="components">
    <div class="field">
      <label class="label">Add your ESP-IDF Component directory</label>
      <div class="field centerize" style="align-items: center;">
        <folderOpen
          propLabel="Enter ESP-IDF Component directory"
          :propModel.sync="storeCurrentComponentPath"
          :propMutate="setCurrentComponentPath"
          :openMethod="openComponentFolder"
        />
        <div class="control">
          <div class="icon">
            <i class="codicon codicon-add" @click="addToComponentList"></i>
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
.icon:hover {
  text-shadow: 2px 1px 5px var(--vscode-input-foreground);
}
</style>
