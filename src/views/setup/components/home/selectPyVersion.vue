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

    <folderOpen
      :propLabel="inputLabel"
      :propModel.sync="manualPythonPath"
      :openMethod="openPythonPath"
      v-if="selectedPythonVersion === pyVersionList[pyVersionList.length - 2]"
    />

    <folderOpen
      :propLabel="inputVenvLabel"
      :propModel.sync="manualVEnvPython"
      :openMethod="openPyVenvPath"
      v-if="selectedPythonVersion === pyVersionList[pyVersionList.length - 1]"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import folderOpen from "../common/folderOpen.vue";

@Component({
  components: {
    folderOpen,
  },
})
export default class SelectPyVersion extends Vue {
  private folderIcon = "codicon codicon-folder";
  @Action private openPythonPath;
  @Action openPyVenvPath;
  @Mutation setSelectedSysPython;
  @Mutation setManualPyPath;
  @Mutation setManualVenvPyPath;
  @State("manualSysPython") storeManualSysPython: string;
  @State("manualVEnvPython") private storeManualVEnvPython: string;
  @State("pyVersionsList") storePyVersionsList: string[];
  @State("selectedSysPython") storeSelectedPythonVersion: string;

  get winRoot() {
    return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
  }

  get inputLabel() {
    return `Enter absolute python binary path to use. Example: ${
      this.winRoot
    }/Users/name/python${this.winRoot ? ".exe" : ""}`;
  }

  get inputVenvLabel() {
    const pyDir = this.winRoot ? "Scripts/python.exe" : "bin/python";
    return `Enter Python virtual environment directory. Example: ${this.winRoot}/Users/name/.espressif/python_env/idf4.0_py3.7_env/${pyDir}`;
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

  get manualVEnvPython() {
    return this.storeManualVEnvPython;
  }
  set manualVEnvPython(newValue: string) {
    this.setManualVenvPyPath(newValue);
  }
}
</script>

<style scoped>
#select-py-version {
  width: 80%;
  margin: 0.25em;
}
</style>
