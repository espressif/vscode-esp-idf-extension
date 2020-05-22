<template>
  <div id="tools-setup">
    <transition name="fade" mode="out-in">
      <div id="tools-init" v-if="selected === 'empty'">
        <router-link to="/" class="arrow go-back right"></router-link>
        <h4>
          Do you want to download the ESP-IDF tools or use existing directories?
        </h4>
        <button
          class="check-button"
          href="#"
          v-on:click="selectToolsSetup('auto')"
        >
          Download ESP-IDF Tools
        </button>
        <button
          class="check-button"
          href="#"
          v-on:click="selectToolsSetup('manual')"
        >
          Skip ESP-IDF Tools download
        </button>
      </div>
      <div id="tools-auto-setup" v-if="selected === 'auto'" key="auto">
        <i
          class="arrow go-back right"
          v-on:click="selectToolsSetup('empty')"
        ></i>
        <h4>ESP-IDF Tools</h4>
        <p>Define ESP-IDF tools install directory.</p>
        <input type="text" class="text-size" v-model="idfTools" />
        <font-awesome-icon
          :icon="folderIcon"
          class="open-icon"
          @mouseover="folderIcon = 'folder-open'"
          @mouseout="folderIcon = 'folder'"
          v-on:click="openFolder"
        />
        <button v-on:click.once="downloadTools" class="check-button">
          Download
        </button>
        <button
          v-on:click="selectToolsSetup('manual')"
          class="check-button"
          v-if="isInstallationCompleted && isPyInstallCompleted"
        >
          Go to next step
        </button>
        <ToolDownload
          :tool="toolVersion"
          v-for="toolVersion in requiredToolsVersions"
          :key="toolVersion.id"
        />
      </div>
      <div id="tools-manual-setup" v-if="selected === 'manual'" key="manual">
        <i class="arrow go-back right" v-on:click="reset"></i>
        <h4>Verify ESP-IDF Tools</h4>
        <div v-if="!isToolsCheckCompleted">
          <p>
            Add your python binary path (the python virtual environment).
            Example: {{ winRoot }}{{ pathSep }}.espressif{{
              pathSep
            }}python_env{{ pathSep }}idf4.0_py3.8_env{{ pathSep
            }}{{ winRoot !== "" ? "bin" : "Scripts" }}{{ pathSep }}python<span
              v-if="winRoot !== ''"
              >.exe</span
            >
          </p>
          <input type="text" class="text-size" v-model="pyBinPath" />
          <p>
            Please specify the directories containing executable binaries for
            required ESP-IDF Tools: <br />
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
            Example: If executable path is {{ winRoot
            }}{{ pathSep }}myToolFolder{{ pathSep }}bin{{ pathSep }}openocd
            <span v-if="winRoot !== ''">.exe</span> then use {{ winRoot
            }}{{ pathSep }}myToolFolder{{ pathSep }}bin{{ pathDelimiter
            }}{{ winRoot }}{{ pathSep }}anotherToolFolder{{ pathSep }}bin
          </p>
          <p>
            Please provide absolute paths. Using $HOME or %HOME% is not
            supported.
          </p>
          <input type="text" class="text-size" v-model="exportedPaths" />
          <h4>Custom environment variables to be defined.</h4>
          <p>
            Replace any ${TOOL_PATH} with absolute path for each custom
            variable. <br />
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

        <div id="tools-check-results" v-if="showIdfToolsChecks">
          <ToolCheck
            :tool="toolCheck"
            v-for="toolCheck in toolsCheckResults"
            :key="toolCheck.id"
          />
          <h4>Verify Python packages requirements</h4>
          <pre id="python-log">{{ pyLog }}</pre>
          <br />
        </div>
        <button
          v-on:click="selectToolsSetup('complete')"
          class="check-button"
          v-if="isToolsCheckCompleted && isPyInstallCompleted"
        >
          Go to next step.
        </button>
        <button v-on:click="checkIdfToolsExists" class="check-button" v-else>
          Click here to check tools exists.
        </button>
      </div>

      <div
        id="tools-complete-setup"
        v-if="selected === 'complete'"
        key="complete"
      >
        <h2>
          ESP-IDF Tools have been configured for this extension of Visual Studio
          Code.
        </h2>
        <button class="check-button" href="#" v-on:click="getExamplesList">
          View ESP-IDF project examples!
        </button>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import ToolDownload from "./components/ToolDownload.vue";
import ToolCheck from "./components/ToolCheck.vue";

@Component({
  components: {
    ToolDownload,
    ToolCheck,
  },
})
export default class ToolsSetup extends Vue {
  public folderIcon = "folder";
  @State("idfToolsPath") private storeIdfToolsPath;
  @State("customExtraPaths") private storeCustomExtraPaths;
  @State("envVars") private storeEnvVars;
  @State("toolsSelectedSetupMode") private storeToolsSelectedSetupMode;
  @State("showIdfToolsChecks") private storeShowIdfToolsChecks;
  @State("toolsCheckResults") private storeToolsCheckResults;
  @State("pathDelimiter") private storePathDelimiter;
  @State("pyBinPath") private storePyBinPath;
  @State("requiredToolsVersions") private storeRequiredToolsVersions;
  @State("isInstallationCompleted") private storeIsInstallationCompleted;
  @State("isPyInstallCompleted") private storeisPyInstallCompleted: string;
  @State("isToolsCheckCompleted") private storeIsToolsCheckCompleted;
  @State("pyLog") private storePyLog: string;

  @Mutation private setCustomExtraPaths;
  @Mutation private setEnvVars;
  @Mutation private setIdfToolsPath;
  @Mutation private setPythonBinPath;
  @Mutation private setPySetupFinish;
  @Mutation private setShowIdfToolsChecks;
  @Mutation private setToolSetupMode;
  @Mutation private setToolCheckFinish;
  @Mutation private setToolsCheckResults;

  @Action private getExamplesList;
  @Action private getRequiredTools;
  @Action("checkManualExportPaths") private checkIdfToolsExists;
  @Action private downloadTools;
  @Action private saveCustomPathsEnvVars;
  @Action("openToolsFolder") private openFolder;

  get idfTools() {
    return this.storeIdfToolsPath;
  }
  set idfTools(val) {
    this.setIdfToolsPath(val);
  }

  get exportedPaths() {
    return this.storeCustomExtraPaths;
  }
  set exportedPaths(val) {
    this.setCustomExtraPaths(val);
  }

  get envVars() {
    return this.storeEnvVars;
  }
  set envVars(val) {
    this.setEnvVars(val);
  }

  get selected() {
    return this.storeToolsSelectedSetupMode;
  }
  get showIdfToolsChecks() {
    return this.storeShowIdfToolsChecks;
  }
  get toolsCheckResults() {
    return this.storeToolsCheckResults;
  }
  get pathDelimiter() {
    return this.storePathDelimiter;
  }
  get pyBinPath() {
    return this.storePyBinPath;
  }
  set pyBinPath(newPath) {
    this.setPythonBinPath(newPath);
  }
  get pyLog() {
    return this.storePyLog;
  }
  get requiredToolsVersions() {
    return this.storeRequiredToolsVersions;
  }
  get isInstallationCompleted() {
    return this.storeIsInstallationCompleted;
  }
  get isToolsCheckCompleted() {
    return this.storeIsToolsCheckCompleted;
  }
  get isPyInstallCompleted() {
    return this.storeisPyInstallCompleted;
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }

  get winRoot() {
    return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
  }

  public selectToolsSetup(installType) {
    if (installType === "complete") {
      this.saveCustomPathsEnvVars();
    } else if (
      installType === "auto" ||
      (this.selected === "empty" && installType === "manual")
    ) {
      this.getRequiredTools();
    }
    this.setToolSetupMode(installType);
  }

  public reset() {
    this.selectToolsSetup("empty");
    this.setToolCheckFinish(false);
    this.setShowIdfToolsChecks(false);
    this.setPySetupFinish(false);
  }
}
</script>

<style>
#tools-setup {
  max-width: 900px;
  margin: auto;
  padding-top: 10%;
  text-align: center;
  color: var(--vscode-editor-foreground);
}
.text-size {
  width: 90%;
}
.check-button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  text-decoration: none;
  margin-top: 2%;
  transition: opacity 0.5s ease 1s;
  border: none;
  cursor: pointer;
  padding: 0.5% 0.5%;
}
.check-button:hover {
  background-color: var(--vscode-button-hoverBackground);
  box-shadow: 1px 0 5px var(--vscode-editor-foreground);
}

.margin-icon {
  margin-left: 5%;
}

.bold {
  font-weight: bold;
}
</style>
