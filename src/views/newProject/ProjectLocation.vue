<template>
  <div class="location">
    <p class="title">Choose project name and directory</p>
    <label for="projectDirectory" class="label">
      Where to create the project directory</label
    >
    <div class="field has-addons has-addons-centered">
      <div class="control is-expanded">
        <input
          type="text"
          name="projectDirectory"
          id="projectDirectory"
          class="input"
          v-model="projectDirectory"
          placeholder="/path/to/container/directory"
        />
      </div>
      <p class="control">
        <a class="button is-static"> {{ pathSep + projectName }} </a>
      </p>
      <div class="control center-icon">
        <font-awesome-icon
          :icon="folderIcon"
          class="fa-icon"
          @mouseover="folderIcon = 'folder-open'"
          @mouseout="folderIcon = 'folder'"
          @click="openProjectDirectory"
        />
      </div>
    </div>
    <div class="field">
      <label for="projectName" class="label" placeholder="projectName"
        >Project Name</label
      >
      <div class="control">
        <input
          type="text"
          name="projectName"
          id="projectName"
          class="input"
          v-model="projectName"
        />
      </div>
    </div>
    <div class="field is-grouped is-grouped-centered">
      <div class="control">
        <button class="button" @click="createProject">Create project</button>
      </div>
    </div>
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

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }

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
.location {
  width: 50%;
}
.center-icon {
  margin-left: 0.5em;
  margin-top: 0.5em;
}
</style>
