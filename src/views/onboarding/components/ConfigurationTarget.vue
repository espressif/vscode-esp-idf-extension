<template>
  <div class="container centerize">
    <div class="field has-addons has-addons-centered">
      <div class="control">
        <label for="showOnboarding" class="checkbox">
          <input
            id="showOnboarding"
            v-model="showOnboardingOnInit"
            type="checkbox"
          />
          Show Onboarding on Visual Studio Code start.
        </label>
      </div>
    </div>
    <div class="field">
      <label for="configurationTarget">
        Where to save configuration settings ?
      </label>
      <div class="control centerize">
        <select
          v-model="selectedConfTarget"
          class="select"
          id="configurationTarget"
        >
          <option value="1">User settings</option>
          <option value="2">Workspace settings</option>
          <option value="3">Workspace folder settings</option>
        </select>
      </div>
    </div>
    <div v-if="selectedConfTarget === '3'" class="field">
      <label for="workspaceFolder">Workspace folder</label>
      <div class="control">
        <select
          v-model="selectedWorkspaceFolder"
          class="select is-fullwidth"
          id="workspaceFolder"
        >
          <option v-for="ws in workspaceFolders" :value="ws" :key="ws">
            {{ ws }}
          </option>
        </select>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <router-link to="/gitpycheck" class="button">START</router-link>
      </div>
    </div>
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

<style lang="scss"></style>
