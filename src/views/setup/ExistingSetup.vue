<template>
  <div class="notification">
    <div class="notification install-choice" @click="goTo('/autoinstall', setupMode.express)">
      <label class="subtitle"> Search ESP-IDF in system...</label>
    </div>
    <div v-for="(prevSetup, i) in idfSetups" :key="prevSetup.id" class="my-1">
      <div
        class="notification install-choice"
        v-show="prevSetup.isValid"
        :data-config-id="prevSetup.idfPath"
        @click="useIdfSetup(i)"
      >
        <label :for="prevSetup.id" class="subtitle">
          {{ prevSetup.idfPath }}</label
        >
        <p>IDF Version {{ prevSetup.version }}</p>
        <p>Python: {{ prevSetup.python }}</p>
        <p>IDF Tools Path: {{ prevSetup.toolsPath }}</p>
        <p>Git path: {{ prevSetup.gitPath }}</p>
        <p>Is valid {{ prevSetup.isValid }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IdfSetup, SetupMode } from "./types";
import { router } from "./main";

@Component
export default class existingSetup extends Vue {
  @State("idfSetups") private storeIdfSetups: IdfSetup[];
  @Action useIdfSetup: (id: number) => void;
  @Mutation setSetupMode: (mode: SetupMode) => void;

  get idfSetups() {
    return this.storeIdfSetups;
  }

  get setupMode() {
    return SetupMode;
  }

  goTo(route: string, setupMode: SetupMode) {
    router.push(route);
    this.setSetupMode(setupMode);
  }
}
</script>
