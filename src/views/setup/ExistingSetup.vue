<template>
  <div class="existing-setup">
    <div
      class="notification install-choice"
      v-for="prevSetup in idfSetups"
      :key="prevSetup.id"
      @click.once="useIdfSetup(prevSetup.id)"
    >
      <label
        :for="prevSetup.id"
        class="subtitle"
        :data-config-id="prevSetup.id"
      >
        {{ prevSetup.id }}</label
      >
      <p>IDF Version {{ prevSetup.version }}</p>
      <p>Python: {{ prevSetup.python }}</p>
      <p>IDF Tools Path: {{ prevSetup.toolsPath }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { IdfSetup } from "./types";

@Component
export default class existingSetup extends Vue {
  @State("existingIdfSetups") private storeIdfSetups: IdfSetup[];
  @Action useIdfSetup: (id: number) => void;

  get idfSetups() {
    return this.storeIdfSetups;
  }
}
</script>
