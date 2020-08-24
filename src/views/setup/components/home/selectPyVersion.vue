<template>
  <div id="select-py-version">
    <div class="field centerize">
      <label for="python-version-select">Python version:</label>
      <div class="control">
        <div class="select">
          <select v-model="selectedPythonVersion" id="python-version-select">
            <option v-for="ver in pyVersionList" :key="ver" :value="ver">
              {{ ver }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <p v-if="pyVersionList && pyVersionList[0] === 'Not found'">
      Please install
      <a href="https://www.python.org/downloads">Python</a> and reload this
      window.
    </p>
    <div
      v-if="selectedPythonVersion === pyVersionList[pyVersionList.length - 1]"
      class="field centerize"
    >
      <label>
        Enter absolute python binary path to use. Example:
        {{ winRoot }}/Users/name/python
        <span v-if="winRoot !== ''">.exe</span>
      </label>
      <div class="field expanded">
        <div class="control expanded">
          <input
            type="text"
            class="input"
            v-model="manualPythonPath"
            placeholder="Enter your absolute python binary path here"
          />
        </div>
        <div class="control">
          <div class="icon">
            <i
              :class="folderIcon"
              @mouseover="folderIcon = 'codicon codicon-folder-opened'"
              @mouseout="folderIcon = 'codicon codicon-folder'"
              v-on:click="openPythonPath"
            ></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class SelectPyVersion extends Vue {
  private folderIcon = "codicon codicon-folder";
  @Action private openPythonPath;
  @Mutation setSelectedSysPython;
  @Mutation setManualPyPath;
  @State("manualSysPython") storeManualSysPython: string;
  @State("pyVersionsList") storePyVersionsList: string[];
  @State("selectedSysPython") storeSelectedPythonVersion: string;

  get winRoot() {
    return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
  }

  get pyVersionList() {
    return this.storePyVersionsList;
  }

  get selectedPythonVersion() {
    return this.storeSelectedPythonVersion;
  }
  set selectedPythonVersion(newValue: string) {
    this.setSelectedSysPython(newValue);
  }

  get manualPythonPath() {
    return this.storeManualSysPython;
  }
  set manualPythonPath(newValue: string) {
    this.setManualPyPath(newValue);
  }
}
</script>

<style scoped>
#select-py-version {
  width: 80%;
  margin: 0.25em;
}
</style>
