<template>
  <div id="status">
    <ul class="statusBar">
      <li
        :class="{
          active: statusEspIdf !== statusType.pending,
          finished: statusEspIdf == statusType.installed,
        }"
      >
        ESP-IDF
      </li>
      <li
        :class="{
          active: statusEspIdfTools !== statusType.pending,
          finished: statusEspIdfTools == statusType.installed,
        }"
      >
        ESP-IDF Tools
      </li>
      <li
        :class="{
          active: statusPyVEnv !== statusType.pending,
          finished: statusPyVEnv == statusType.installed,
        }"
      >
        Python virtual environment
      </li>
    </ul>

    <div class="centerize notification">
      <div class="control barText">
        <p class="label">Installing ESP-IDF...</p>
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
      <div class="field is-grouped" v-if="espIdfErrorStatus">
        <label class="label">{{ espIdfErrorStatus }}</label>
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
    </div>

    <div class="centerize notification">
      <div class="control barText">
        <p class="label">Installing ESP-IDF Tools...</p>
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
      <div class="toolsSection" v-if="statusEspIdfTools !== statusType.pending">
        <toolDownload
          v-for="tool in toolsResults"
          :key="tool.id"
          :tool="tool"
        />
      </div>
    </div>

    <div class="centerize notification">
      <div class="control barText">
        <p class="label">
          Installing Python virtual environment for ESP-IDF...
        </p>
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
import { State } from "vuex-class";
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
  @State("espIdfErrorStatus") private storeErrorStatus: string;
  @State("isIdfInstalling") private storeIsInstalling: boolean;
  @State("pyReqsLog") private storePyReqsLog: string;
  @State("statusEspIdf") private storeEspIdfStatus: StatusType;
  @State("statusEspIdfTools") private storeEspIdfToolsStatus: StatusType;
  @State("statusPyVEnv") private storePyVenvStatus: StatusType;
  @State("toolsResults") private storeToolsResults: IEspIdfTool[];

  get espIdfErrorStatus() {
    return this.storeErrorStatus;
  }

  get isInstalling() {
    return this.storeIsInstalling;
  }

  get pyReqsLog() {
    return this.storePyReqsLog;
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

.statusBar {
  display: flex;
  width: 100%;
  counter-reset: step;
  align-items: center;
  justify-content: space-around;
  margin: 0.5em;
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

.statusBar li {
  list-style-type: none;
  width: 30%;
  text-align: center;
}

.statusBar li:before {
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

.statusBar li:after {
  content: "";
  width: 22%;
  height: 2px;
  top: 10.75em;
  margin-left: 2%;
  background-color: var(--vscode-button-foreground);
  position: absolute;
  transition: opacity 1s;
}

.statusBar li:last-child:after {
  content: none;
}

.statusBar li.active:before,
.statusBar li.active:after {
  color: var(--vscode-button-foreground);
}

.statusBar li.active:before {
  border-color: var(--vscode-button-background);
}

.statusBar li.finished:before {
  background-color: var(--vscode-button-background);
}

.statusBar li.active:after {
  background-color: var(--vscode-button-background);
}

.toolsSection {
  display: flex;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
}
</style>
