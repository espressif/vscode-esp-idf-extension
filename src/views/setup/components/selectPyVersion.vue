<script setup lang="ts">
import folderOpen from "./folderOpen.vue";
import { useSetupStore } from "../store";
import { storeToRefs } from "pinia";
import { computed } from "vue";

const store = useSetupStore();

const {
  selectedSysPython,
  pyVersionsList,
  pathSep,
  manualPythonPath,
} = storeToRefs(store);

const winRoot = computed(() => {
  return pathSep.value === "\\" ? "C:" : "";
});

const inputLabel = computed(() => {
  return `Enter absolute python executable path to use. Example: ${winRoot}${pathSep}Users${pathSep}name${pathSep}myPythonFolder${pathSep}python${
    winRoot ? ".exe" : ""
  }`;
});

function clearPyErrorStatus() {
  store.pyExecErrorStatus = "";
}

function setManualPyPath(pyPath: string) {
  store.manualPythonPath = pyPath;
}
</script>

<template>
  <div id="select-py-version">
    <div class="field">
      <label for="python-version-select" class="label"
        >Select Python version:</label
      >
      <div class="control">
        <div class="select">
          <select
            v-model="selectedSysPython"
            id="python-version-select"
            @change="clearPyErrorStatus"
          >
            <option v-for="ver in pyVersionsList" :key="ver" :value="ver">
              {{ ver }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <p v-if="pyVersionsList && pyVersionsList[0] === 'Not found'">
      Please install
      <a href="https://www.python.org/downloads">Python</a> and reload this
      window.
    </p>

    <folderOpen
      :propLabel="inputLabel"
      :propModel.sync="manualPythonPath"
      :propMutate="setManualPyPath"
      :openMethod="store.openPythonPath"
      :onChangeMethod="clearPyErrorStatus"
      v-if="selectedSysPython === pyVersionsList[pyVersionsList.length - 1]"
    />
  </div>
</template>

<style scoped>
#select-py-version {
  margin: 0.25em;
}
</style>
