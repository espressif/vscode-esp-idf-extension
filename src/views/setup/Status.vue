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

    <div class="centerize">
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
      <IdfDownload v-if="isInstalling" />
      <div class="field" v-if="espIdfErrorStatus">
        <div class="icon">
          <i
            :class="
              statusEspIdf === statusType.installed
                ? 'codicon codicon-check'
                : 'codicon codicon-close'
            "
          ></i>
        </div>
        <label>{{ espIdfErrorStatus }}</label>
      </div>
    </div>

    <div class="centerize">
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
      <div class="centerize">
        <toolDownload
          v-for="tool in toolsResults"
          :key="tool.id"
          :tool="tool"
        />
      </div>
    </div>

    <div class="centerize">
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
      <div
        class="field"
        v-if="pyReqsLog && statusPyVEnv !== statusType.installed"
      >
        <p id="python-log" class="notification">{{ pyReqsLog }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IEspIdfTool, StatusType } from "./types";
import IdfDownload from "./components/IdfDownload.vue";
import toolDownload from "./components/toolDownload.vue";

@Component({
  components: {
    IdfDownload,
    toolDownload,
  },
})
export default class Status extends Vue {
  @State("espIdf") storeEspIdf: string;
  @State("espIdfErrorStatus") private storeErrorStatus: string;
  @State("isIdfInstalling") private storeIsInstalling: boolean;
  @State("manualPythonPath") storeManualPythonPath: string;
  @State("pyReqsLog") private storePyReqsLog: string;
  @State("toolsFolder") storeToolsFolder: string;
  @State("selectedSysPython") storeSelectedPythonVersion: string;
  @State("statusEspIdf") private storeEspIdfStatus: StatusType;
  @State("statusEspIdfTools") private storeEspIdfToolsStatus: StatusType;
  @State("statusPyVEnv") private storePyVenvStatus: StatusType;
  @State("toolsResults") private storeToolsResults: IEspIdfTool[];
  @Action customInstallEspIdf;
  @Action installEspIdfTools;

  get espIdf() {
    return this.storeEspIdf;
  }

  get espIdfErrorStatus() {
    return this.storeErrorStatus;
  }

  get isInstalling() {
    return this.storeIsInstalling;
  }

  get pyReqsLog() {
    return this.storePyReqsLog;
  }

  get pyVenvPath() {
    return this.storeManualPythonPath;
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

  get toolsResults() {
    return this.storeToolsResults;
  }
}
</script>

<style scoped>
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

#python-log {
  white-space: pre-line;
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
