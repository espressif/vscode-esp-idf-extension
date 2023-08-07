<template>
  <div id="install">
    <div class="notification">
      <div class="field" v-if="isNotWinPlatform && gitVersion">
        <label data-config-id="git-version"
          >Git version: {{ gitVersion }}</label
        >
      </div>

      <selectEspIdf></selectEspIdf>

      <div v-if="espIdfErrorStatus">
        <span class="error-text">{{ espIdfErrorStatus }}</span>
      </div>

      <folderOpen
        propLabel="Enter ESP-IDF Tools directory (IDF_TOOLS_PATH)"
        :propModel.sync="toolsFolder"
        :propMutate="setToolsFolder"
        :openMethod="openEspIdfToolsFolder"
      />

      <selectPyVersion v-if="isNotWinPlatform"></selectPyVersion>

      <div v-if="pyExecErrorStatus">
        <span class="error-text">{{ pyExecErrorStatus }}</span>

      </div>

      <div class="field install-btn">
        <div class="control">
          <button
            @click="installEspIdf"
            class="button"
            data-config-id="start-install-btn"
            :disabled="isThereAnError"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IEspIdfLink } from "./types";
import folderOpen from "./components/folderOpen.vue";
import selectEspIdf from "./components/selectEspIdf.vue";
import selectPyVersion from "./components/selectPyVersion.vue";

@Component({
  components: {
    folderOpen,
    selectEspIdf,
    selectPyVersion,
  },
})
export default class Install extends Vue {
  @Action installEspIdf;
  @Action openEspIdfToolsFolder;
  // @Mutation setEspIdfErrorStatus;
  // @Mutation setPyExecErrorStatus;
  @Mutation setToolsFolder;
  @State("gitVersion") private storeGitVersion: string;
  @State("espIdfErrorStatus") private storeErrorStatus: string;
  @State("pathSep") private storePathSep: string;
  @State("pyExecErrorStatus") private storePyExecErrorStatus: string;
  @State("toolsFolder") private storeToolsFolder: string;
  @State("selectedEspIdfVersion") private storeSelectedEspIdfVersion: IEspIdfLink;

  @Watch('selectedEspIdfVersion')
  onSelectedEspIdfVersionChanged() {
    this.setToolsFolder(this.toolsFolder);
  }

  get isThereAnError() {
    return this.espIdfErrorStatus !== '' || this.pyExecErrorStatus !== '';
  }

  get gitVersion() {
    return this.storeGitVersion;
  }

  get espIdfErrorStatus() {
    return this.storeErrorStatus;
  }

  get isNotWinPlatform() {
    return this.storePathSep.indexOf("/") !== -1;
  }

  get pyExecErrorStatus() {
    return this.storePyExecErrorStatus;
  }

  get toolsFolder() {
    return this.storeToolsFolder;
  }

  get selectedEspIdfVersion() {
    return this.storeSelectedEspIdfVersion;
  }
}
</script>

<style scoped>
#install {
  margin: 1% 5%;
}

.error-text {
  color: var(--vscode-editorError-foreground);
  font-size: small;
}
</style>
