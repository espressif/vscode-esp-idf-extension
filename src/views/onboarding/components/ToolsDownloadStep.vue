<template>
  <div class="tools-download-step">
    <i class="arrow go-back right" v-on:click="selectToolsSetup('empty')"></i>
    <h4 class="title is-spaced">ESP-IDF Tools</h4>
    <p class="subtitle">Define ESP-IDF tools install directory.</p>
    <div class="field is-grouped is-grouped-centered text-size">
      <div class="control is-expanded">
        <input type="text" class="input" v-model="idfTools" />
      </div>
      <div class="control">
        <div class="icon is-large is-size-4">
          <iconify-icon
            :icon="folderIcon"
            @mouseover="folderIcon = 'folder-opened'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openFolder"
          />
        </div>
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <button v-on:click.once="downloadTools" class="button">
          Download
        </button>
      </div>
      <div class="control">
        <button
          v-on:click="selectToolsSetup('manual')"
          class="button"
          v-if="isInstallationCompleted && isPyInstallCompleted"
        >
          Go to next step
        </button>
      </div>
    </div>
    <ToolDownload
      :tool="toolVersion"
      v-for="toolVersion in requiredToolsVersions"
      :key="toolVersion.id"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import ToolDownload from "./ToolDownload.vue";

@Component({
  components: {
    ToolDownload,
  },
})
export default class ToolsDownloadStep extends Vue {
  public folderIcon = "folder";
  @Action private downloadTools;
  @Action("openToolsFolder") private openFolder;
  @Mutation private setIdfToolsPath;
  @Prop() private isPyInstallCompleted;
  @Prop() private selectToolsSetup;
  @State("idfToolsPath") private storeIdfToolsPath;
  @State("isInstallationCompleted") private storeIsInstallationCompleted;
  @State("requiredToolsVersions") private storeRequiredToolsVersions;

  get idfTools() {
    return this.storeIdfToolsPath;
  }
  set idfTools(val) {
    this.setIdfToolsPath(val);
  }
  get isInstallationCompleted() {
    return this.storeIsInstallationCompleted;
  }
  get requiredToolsVersions() {
    return this.storeRequiredToolsVersions;
  }
}
</script>

<style>
.tools-download-step {
  display: flex;
  align-items: center;
  flex-direction: column;
}
.tools-input {
  display: flex;
  width: 90%;
  justify-content: center;
}
</style>
