<template>
  <div>
    <div class="field centerize">
      <label for="python-version-select">Python version:</label>
      <div class="control">
        <select
          v-model="selectedPythonVersion"
          id="python-version-select"
          class="select"
        >
          <option v-for="ver in pyVersionList" :key="ver" :value="ver">
            {{ ver }}
          </option>
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
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Mutation, State } from "vuex-class";

@Component
export default class SelectPyVersion extends Vue {
  private manualPythonPath: string = "";
  @Mutation setSelectedSysPython;
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
}
</script>
