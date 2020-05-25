<template>
  <div>
    <p>
      Add your python binary path (the python virtual environment). Example:
      {{ winRoot }}{{ pathSep }}.espressif{{ pathSep }}python_env{{
        pathSep
      }}idf4.0_py3.8_env{{ pathSep }}{{ winRoot !== "" ? "bin" : "Scripts"
      }}{{ pathSep }}python<span v-if="winRoot !== ''">.exe</span>
    </p>
    <input type="text" class="text-size" v-model="pyBinPath" />
    <p>
      Please specify the directories containing executable binaries for required
      ESP-IDF Tools: <br />
      <span class="bold"> |</span>
      <span
        v-for="toolVersion in requiredToolsVersions"
        :key="toolVersion.id"
        class="bold"
      >
        {{ toolVersion.id }} |
      </span>
    </p>
    <p>Make sure to also include CMake and Ninja-build.</p>
    <p>Separate each path using ({{ pathDelimiter }}).</p>
    <p>
      Example: If executable path is {{ winRoot }}{{ pathSep }}myToolFolder{{
        pathSep
      }}bin{{ pathSep }}openocd <span v-if="winRoot !== ''">.exe</span> then use
      {{ winRoot }}{{ pathSep }}myToolFolder{{ pathSep }}bin{{ pathDelimiter
      }}{{ winRoot }}{{ pathSep }}anotherToolFolder{{ pathSep }}bin
    </p>
    <p>
      Please provide absolute paths. Using $HOME or %HOME% is not supported.
    </p>
    <input type="text" class="text-size" v-model="exportedPaths" />
    <h4>Custom environment variables to be defined.</h4>
    <p>
      Replace any ${TOOL_PATH} with absolute path for each custom variable.
      <br />
      For example:
      <strong>${TOOL_PATH}/openocd-esp32/share/openocd/scripts</strong>
      should be replaced as {{ winRoot }}{{ pathSep }}openocd-esp32{{
        pathSep
      }}share{{ pathSep }}openocd{{ pathSep }}
    </p>
    <div id="env-vars-to-set" v-for="(value, key) in envVars" :key="key">
      <div class="env-var">
        <p>{{ key }}</p>
        <input type="text" class="text-size" v-model="envVars[key]" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class ToolsManual extends Vue {
  @Mutation private setCustomExtraPaths;
  @Mutation private setEnvVars;
  @Mutation private setPythonBinPath;
  @State("customExtraPaths") private storeCustomExtraPaths;
  @State("envVars") private storeEnvVars;
  @State("pathDelimiter") private storePathDelimiter;
  @State("pyBinPath") private storePyBinPath;
  @State("requiredToolsVersions") private storeRequiredToolsVersions;

  get envVars() {
    return this.storeEnvVars;
  }
  set envVars(val) {
    this.setEnvVars(val);
  }

  get exportedPaths() {
    return this.storeCustomExtraPaths;
  }
  set exportedPaths(val) {
    this.setCustomExtraPaths(val);
  }

  get pathDelimiter() {
    return this.storePathDelimiter;
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }

  get pyBinPath() {
    return this.storePyBinPath;
  }
  set pyBinPath(newPath) {
    this.setPythonBinPath(newPath);
  }

  get requiredToolsVersions() {
    return this.storeRequiredToolsVersions;
  }

  get winRoot() {
    return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
  }
}
</script>

<style>
.bold {
  font-weight: bold;
}
</style>
