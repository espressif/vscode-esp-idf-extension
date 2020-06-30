<template>
  <div class="content is-small">
    <div class="field">
      <label>
        Add your ESP-IDF virtual environment python executable absolute path.
        Example:
        {{ winRoot }}{{ pathSep }}.espressif{{ pathSep }}python_env{{
          pathSep
        }}idf4.0_py3.8_env{{ pathSep }}{{ winRoot !== "" ? "bin" : "Scripts"
        }}{{ pathSep }}python<span v-if="winRoot !== ''">.exe</span>
      </label>
      <div class="control">
        <input type="text" class="input is-small" v-model="pyBinPath" />
      </div>
    </div>
    <p>
      Please provide absolute paths separated by ({{ pathDelimiter }}). Using ~,
      $HOME or %HOME% is not supported.<br />Example: If executable path is
      {{ winRoot }}{{ pathSep }}myToolFolder{{ pathSep }}bin{{ pathSep }}openocd
      <span v-if="winRoot !== ''">.exe</span> then use {{ winRoot
      }}{{ pathSep }}myToolFolder{{ pathSep }}bin{{ pathDelimiter }}{{ winRoot
      }}{{ pathSep }}anotherToolFolder{{ pathSep }}bin
    </p>
    <div class="field">
      <label for="exportPaths" class="label is-small">
        Please specify the directories containing executable binaries for
        required ESP-IDF Tools (Make sure to also include CMake and
        Ninja-build): <br />
        <span class="bold"> |</span>
        <span
          v-for="toolVersion in requiredToolsVersions"
          :key="toolVersion.id"
          class="bold"
        >
          {{ toolVersion.id }} |
        </span>
      </label>
      <div class="control">
        <textarea
          class="input textarea is-small"
          v-model="exportedPaths"
          id="exportPaths"
          rows="3"
        ></textarea>
      </div>
    </div>
    <h4 class="subtitle">Custom environment variables to be defined.</h4>
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
        <div class="field">
          <div class="control">
            <input type="text" class="input is-small" v-model="envVars[key]" />
          </div>
        </div>
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
