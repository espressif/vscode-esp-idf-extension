<template>
  <div id="status">
    <ul class="progressBar">
      <li class="active">ESP-IDF</li>
      <li :class="{ active: statusEspIdfTools !== statusType.pending }">
        IDF Tools
      </li>
      <li :class="{ active: statusPyVEnv !== statusType.pending }">
        Python Virtual Environment
      </li>
    </ul>

    <div class="esp-idf">
      <div class="control barText">
        <p>Installing ESP-IDF...</p>
        <div class="icon">
          <i
            :class="
              statusEspIdf === statusType.installed
                ? 'codicon codicon-check'
                : statusEspIdf === statusType.failed
                ? 'codicon codicon-close'
                : 'codicon codicon-loading'
            "
          ></i>
        </div>
      </div>
      <div v-if="statusEspIdf === statusType.failed">
        <p>
          Found existing ESP-IDF in {{ espIdf }}. Replace with selected version
          ?
        </p>
        <button @click="customInstallEspIdf" class="button">Replace</button>
        <button @click="installEspIdfTools" class="button">Use existing</button>
      </div>
    </div>

    <div class="idf-tools">
      <div class="control barText">
        <p>Installing ESP-IDF Tools...</p>
        <div class="icon">
          <i
            :class="
              statusEspIdfTools === statusType.installed
                ? 'codicon codicon-check'
                : statusEspIdfTools === statusType.failed
                ? 'codicon codicon-close'
                : 'codicon codicon-loading'
            "
          ></i>
        </div>
      </div>
      <div v-if="statusEspIdfTools === statusType.failed">
        <p>
          Found existing ESP-IDF Tools in {{ toolsPath }}. Replace ESP-IDF tools
          ?
        </p>
        <button @click="replaceIdfToolsPath" class="button">Replace</button>
        <button @click="useExistingTools" class="button">Use existing</button>
      </div>
    </div>

    <div class="py-venv">
      <div class="control barText">
        <p>Installing Python virtual environment for ESP-IDF...</p>
        <div class="icon">
          <i
            :class="
              statusPyVEnv === statusType.installed
                ? 'codicon codicon-check'
                : statusPyVEnv === statusType.failed
                ? 'codicon codicon-close'
                : 'codicon codicon-loading'
            "
          ></i>
        </div>
      </div>
      <div v-if="statusPyVEnv === statusType.failed">
        <p>
          Found existing Python Virtual Environment in {{ pyVenvPath }}. Replace
          environment ?
        </p>
        <button @click="replaceVenv" class="button">Replace</button>
        <button @click="useExistingVenv" class="button">Use existing</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { StatusType } from "./types";

@Component
export default class Status extends Vue {
  @State("espIdf") storeEspIdf: string;
  @State("toolsFolder") storeToolsFolder: string;
  @State("manualPythonPath") storeManualPythonPath: string;
  @State("selectedSysPython") storeSelectedPythonVersion: string;
  @State("statusEspIdf") private storeEspIdfStatus: StatusType;
  @State("statusEspIdfTools") private storeEspIdfToolsStatus: StatusType;
  @State("statusPyVEnv") private storePyVenvStatus: StatusType;
  @Action customInstallEspIdf;
  @Action installEspIdfTools;

  get espIdf() {
    return this.storeEspIdf;
  }

  get statusEspIdf() {
    return this.storeEspIdfStatus;
  }

  get statusEspIdfTools() {
    return this.storeEspIdfToolsStatus;
  }

  get statusPyVEnv() {
    return this.storePyVenvStatus;
  }

  get statusType() {
    return StatusType;
  }

  get toolsPath() {
    return this.storeToolsFolder;
  }

  get pyVenvPath() {
    return this.storeManualPythonPath;
  }
}
</script>

<style>
#status {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.progressBar {
  display: flex;
  width: 100%;
  counter-reset: step;
  align-items: center;
  justify-content: space-around;
  margin: 2em;
}

.barText {
  display: flex;
  align-items: center;
  justify-items: center;
  margin: 1em;
}

.progressBar li {
  list-style-type: none;
  width: 30%;
  text-align: center;
}

.progressBar li:before {
  content: counter(step);
  counter-increment: step;
  width: 35px;
  height: 35px;
  display: block;
  text-align: center;
  margin: 0 auto 10px auto;
  border: 2px solid #ddd;
  line-height: 30px;
  border-radius: 50%;
  transition: opacity 1s;
}

.progressBar li:after {
  content: "";
  width: 25%;
  height: 2px;
  top: 9em;
  margin-left: 15px;
  background-color: var(--vscode-button-foreground);
  position: absolute;
  transition: opacity 1s;
}

.progressBar li:last-child:after {
  content: none;
}

.progressBar li.active:before,
.progressBar li.active:after {
  color: var(--vscode-button-foreground);
}

.progressBar li.active:before {
  border-color: var(--vscode-button-background);
  background-color: var(--vscode-button-background);
}

.progressBar li.active:after {
  background-color: var(--vscode-button-background);
}
</style>
