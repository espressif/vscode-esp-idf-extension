<template>
  <div id="install">
    <h1 class="title">ESPRESSIF</h1>
    <div class="centerize" v-if="!isInstalled">
      <div class="field">
        <label>Git version: {{ gitVersion }}</label>
      </div>

      <selectEspIdf></selectEspIdf>

      <selectPyVersion></selectPyVersion>

      <div class="field install-btn">
        <div class="control">
          <button v-on:click.once="installEspIdf" class="button">
            Install
          </button>
        </div>
      </div>

      <div class="field install-btn">
        <div class="control">
          <router-link to="/custom" class="button" @click="loadToolsInfo"
            >Customize setup</router-link
          >
        </div>
      </div>
    </div>
    <div class="install-finished" v-if="isInstalled">
      <h2 class="subtitle">
        ESP-IDF have been configured for this extension of Visual Studio Code.
      </h2>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import selectEspIdf from "./components/home/selectEspIdf.vue";
import selectPyVersion from "./components/home/selectPyVersion.vue";

@Component({
  components: {
    selectEspIdf,
    selectPyVersion,
  },
})
export default class Install extends Vue {
  private isInstalling = false;
  @Action installEspIdf;
  @Action customInstallEspIdf;
  @State("gitVersion") private storeGitVersion: string;
  @State("isInstalled") private storeIsInstalled: boolean;

  get gitVersion() {
    return this.storeGitVersion;
  }

  get isInstalled() {
    return this.storeIsInstalled;
  }

  loadToolsInfo() {
    this.isInstalling = true;
    this.customInstallEspIdf();
  }
}
</script>
