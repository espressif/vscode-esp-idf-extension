<template>
  <div>
    <input id="showOnboarding" v-model="showOnboardingOnInit" type="checkbox" />
    <label for="showOnboarding">
      Show Onboarding on Visual Studio Code start.
    </label>
    <br /><br />
    <label for="configurationTarget">
      Where to save configuration settings ?
    </label>
    <br />
    <br />
    <select v-model="selectedConfTarget">
      <option value="1">User settings</option>
      <option value="2">Workspace settings</option>
      <option value="3">Workspace folder settings</option>
    </select>
    <br /><br />
    <div v-if="selectedConfTarget === '3'">
      <select v-model="selectedWorkspaceFolder">
        <option v-for="ws in workspaceFolders" :value="ws" :key="ws">
          {{ ws }}
        </option>
      </select>
      <br /><br />
    </div>
    <router-link to="/gitpycheck" class="onboarding-button">START</router-link>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Action, Mutation, State } from "vuex-class";
import { Component } from "vue-property-decorator";

@Component
export default class ConfigurationTarget extends Vue {
  @Action private updateConfTarget;
  @Action private updateShowOnboardingOnInit;
  @Mutation("updateConfTarget") private modifyConfTarget;
  @Mutation private setSelectedWorkspaceFolder;
  @Mutation private setShowOnboardingOnInit;
  @State("selectedConfTarget") private storeSelectedConfTarget: number;
  @State("selectedWorkspaceFolder") private storeSelectedWorkspace: string;
  @State("showOnboardingOnInit") private storeShowOnboardingOnInit: boolean;
  @State("workspaceFolders") private storeWorkspaceFolders: string[];

  get selectedConfTarget() {
    return this.storeSelectedConfTarget;
  }
  set selectedConfTarget(val) {
    this.updateConfTarget(val);
    this.modifyConfTarget(val);
  }

  get selectedWorkspaceFolder() {
    return this.storeSelectedWorkspace;
  }
  set selectedWorkspaceFolder(newFolder) {
    this.setSelectedWorkspaceFolder(newFolder);
  }

  get showOnboardingOnInit(): boolean {
    return this.storeShowOnboardingOnInit;
  }
  set showOnboardingOnInit(val) {
    this.setShowOnboardingOnInit(val);
    this.updateShowOnboardingOnInit(val);
  }

  get workspaceFolders() {
    return this.storeWorkspaceFolders;
  }
}
</script>
