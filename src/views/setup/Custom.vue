<template>
  <div id="custom-setup">
    <div class="centerize" v-if="!isInstalled">
      <selectEspIdf></selectEspIdf>

      <selectPyVersion></selectPyVersion>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class CustomSetup extends Vue {
  private useExistingPyEnv: boolean = false;
  @Mutation setToolsFolder;
  @State("toolsFolder") private storeToolsFolder: string;

  get toolsFolder() {
    return this.storeToolsFolder;
  }

  set toolsFolder(newValue: string) {
    this.setToolsFolder(newValue);
  }
}
</script>
