<template>
  <div id="auto-install">
    <div class="centerize" v-if="!isInstalled">
      <div class="field">
        <label>Git version: {{ gitVersion }}</label>
      </div>
      <div class="field">
        <label for="idf-version-select">Select ESP-IDF version:</label>
        <div class="control">
          <select v-model="selectedIdfVersion" class="select">
            <option
              v-for="ver in idfVersionList"
              :key="ver.name"
              :value="ver"
              >{{ ver.name }}</option
            >
          </select>
        </div>
      </div>
      <div
        class="field centerize text-size"
        v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
      >
        <label>Enter ESP-IDF directory</label>
        <div class="field is-grouped text-size">
          <div class="control is-expanded">
            <input type="text" class="input" v-model="idfPath" />
          </div>
          <div class="control">
            <font-awesome-icon
              :icon="folderIcon"
              class="open-icon"
              @mouseover="folderIcon = 'folder-open'"
              @mouseout="folderIcon = 'folder'"
              v-on:click="openFolder"
            />
          </div>
        </div>
      </div>

      <div class="field">
        <label for="python-version-select">Python version:</label>
        <div class="control">
          <select
            v-model="selectedPythonVersion"
            id="python-version-select"
            @change="setPythonSysIsValid(false)"
            class="select"
          >
            <option v-for="ver in pyVersionList" :key="ver" :value="ver">{{
              ver
            }}</option>
          </select>
        </div>
      </div>
      <p v-if="pyVersionList && pyVersionList[0] === 'Not found'">
        Please install
        <a href="https://www.python.org/downloads">Python</a> and reload this
        window.
      </p>
      <div
        v-if="selectedPythonVersion === pyVersionList[pyVersionList.length - 1]"
        class="field"
      >
        <label>
          Enter absolute python binary path to use. Example:
          {{ winRoot }}/Users/name/python
          <span v-if="winRoot !== ''">.exe</span>
        </label>
        <div class="control">
          <input
            type="text"
            class="input"
            v-model="manualPythonPath"
            placeholder="Enter your absolute python binary path here"
          />
        </div>
      </div>
      <div class="field is-grouped is-grouped-centered">
        <div class="control">
          <button v-on:click="installEspIdf" class="button">Install</button>
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
import { IEspIdfLink, IEspIdfStatus } from "../store/types";

@Component
export default class AutoInstall extends Vue {
  public folderIcon = "folder";
  private manualPythonPath = "";
  @Action("openEspIdfFolder") private openFolder;
  @Action private startIdfInstall;
  @Mutation("showIdfPathCheck") private updateChecksView;
  @Mutation private setIdfPath;
  @Mutation private setPythonSysIsValid;
  @Mutation private setSelectedIdfVersion;
  @Mutation private setSelectedPythonVersion;
  @State("gitVersion") private storeGitVersionList;
  @State("pyVersionList") private storePythonVersionList;
  @State("idfIsInstalled") private isInstalled;
  @State("idfPath") private storeIdfPath: string;
  @State("idfVersionList") private storeIdfVersionList: IEspIdfLink[];
  @State("selectedIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("selectedPythonVersion") private storeSelectedPythonVersion;

  installEspIdf() {
    this.startIdfInstall(this.manualPythonPath);
  }

  get gitVersion() {
    return this.storeGitVersionList;
  }

  get idfPath() {
    return this.storeIdfPath;
  }
  set idfPath(newPath: string) {
    this.setIdfPath(newPath);
  }

  get idfVersionList() {
    return this.storeIdfVersionList;
  }

  get pyVersionList() {
    return this.storePythonVersionList;
  }

  get selectedIdfVersion() {
    return this.storeSelectedIdfVersion;
  }
  set selectedIdfVersion(selectedVersion: IEspIdfLink) {
    this.setSelectedIdfVersion(selectedVersion);
    this.updateChecksView(false);
  }

  get selectedPythonVersion() {
    return this.storeSelectedPythonVersion;
  }
  set selectedPythonVersion(newVal: string) {
    this.setSelectedPythonVersion(newVal);
  }

  get winRoot() {
    return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
  }
}
</script>

<style lang="scss" scoped></style>
