<template>
  <div class="centerize notification">
    <div
      class="notification install-choice"
      v-for="(prevSetup, i) in idfSetups"
      :key="prevSetup.id"
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
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { IdfSetup } from "./types";

@Component
export default class existingSetup extends Vue {
  @State("idfSetups") private storeIdfSetups: IdfSetup[];
  @Action useIdfSetup: (id: number) => void;

  get idfSetups() {
    return this.storeIdfSetups;
  }
}
</script>
