<template>
  <div id="install">
    <IdfDownload v-if="isInstalling" />
    <div class="centerize" v-if="!isInstalling">
      <div class="field">
        <label>Git version: {{ gitVersion }}</label>
      </div>

      <selectEspIdf></selectEspIdf>

      <selectPyVersion></selectPyVersion>

      <div class="field install-btn">
        <div class="control">
          <button @click.once="autoInstall" class="button">Install</button>
        </div>
      </div>

      <div class="field install-btn">
        <div class="control">
          <button class="button" @click="loadToolsInfo">Customize setup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import selectEspIdf from "./components/home/selectEspIdf.vue";
import selectPyVersion from "./components/home/selectPyVersion.vue";
import IdfDownload from "./components/install/IdfDownload.vue";
import { IEspIdfLink } from "./types";

@Component({
  components: {
    IdfDownload,
    selectEspIdf,
    selectPyVersion,
  },
})
export default class Install extends Vue {
  @Action installEspIdf;
  @Action customInstallEspIdf;
  @Mutation setIsIdfInstalling;
  @State("gitVersion") private storeGitVersion: string;
  @State("selectedEspIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("isIdfInstalling") private storeIsInstalling: boolean;

  get gitVersion() {
    return this.storeGitVersion;
  }

  get isInstalling() {
    return this.storeIsInstalling;
  }

  autoInstall() {
    if (this.storeSelectedIdfVersion.filename !== "manual") {
      this.setIsIdfInstalling(true);
    }
    this.installEspIdf();
  }

  loadToolsInfo() {
    if (this.storeSelectedIdfVersion.filename !== "manual") {
      this.setIsIdfInstalling(true);
    }
    this.customInstallEspIdf();
  }
}
</script>
