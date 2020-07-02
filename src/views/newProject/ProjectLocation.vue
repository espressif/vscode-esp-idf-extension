<template>
  <div class="location">
    <label for="projectDirectory" class="label">
      Where to create the project directory</label
    >
    <br />
    <br />
    <input
      type="text"
      name="projectDirectory"
      id="projectDirectory"
      class="input"
      v-model="projectDirectory"
      placeholder="/path/to/container/directory"
    />
    <font-awesome-icon
      :icon="folderIcon"
      class="fa-icon"
      @mouseover="folderIcon = 'folder-open'"
      @mouseout="folderIcon = 'folder'"
      @click="openProjectDirectory"
    />
    <br />
    <br />
    <label for="projectName" class="label" placeholder="projectName"
      >Project Name</label
    >
    <br />
    <br />
    <input
      type="text"
      name="projectName"
      id="projectName"
      class="input"
      v-model="projectName"
    />
    <br />
    <br />
    <button class="button" @click="createProject">Create project</button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class ProjectLocation extends Vue {
  public folderIcon = "folder";
  @Action private openProjectDirectory;
  @Action private createProject;
  @Mutation private setProjectDirectory;
  @Mutation private setProjectName;
  @State("projectDirectory") private storeProjectDirectory: string;
  @State("projectName") private storeProjectName: string;

  get projectName() {
    return this.storeProjectName;
  }
  set projectName(newName: string) {
    this.setProjectName(newName);
  }

  get projectDirectory() {
    return this.storeProjectDirectory;
  }
  set projectDirectory(newPath) {
    this.setProjectDirectory(newPath);
  }
}
</script>

<style scoped>
.input {
  width: 60%;
}
</style>
