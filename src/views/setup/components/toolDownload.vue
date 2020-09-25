<template>
  <div class="progressStatus">
    <div :key="tool.id" class="pkg-progress">
      <strong>{{ tool.id }}</strong> <em>{{ tool.expected }}</em>
      <div class="progressBar">
        <div v-bind:style="{ width: tool.progress }"></div>
      </div>
    </div>
    <div class="progressText">
      <span v-if="tool.progress === '100.00%'">
        <span>Checksum :</span>
        {{ tool.hashResult ? "OK" : "Invalid" }}
        <br />
      </span>
      <span v-if="tool.hasFailed">Download again</span>
      <span v-if="tool.progress !== '100.00%'">
        <span>Download Status:</span> {{ tool.progress }}
        {{ tool.progressDetail }}
      </span>
      <span v-if="tool.progress === '100.00%' && !isInstallationCompleted">
        <span>Extracting {{ tool.id }}...</span>
      </span>
      <span v-if="tool.progress === '100.00%' && isInstallationCompleted">
        <span>Installed in</span>
        {{
          idfTools +
          pathSep +
          "tools" +
          pathSep +
          tool.id +
          pathSep +
          tool.expected +
          pathSep +
          tool.id
        }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { IEspIdfTool, StatusType } from "../types";

@Component
export default class ToolDownloadInfo extends Vue {
  @Prop() tool: IEspIdfTool;
  @State("toolsFolder") private storeIdfToolsPath;
  @State("statusEspIdfTools") private storeEspIdfToolsStatus: StatusType;

  get idfTools() {
    return this.storeIdfToolsPath;
  }

  get isInstallationCompleted() {
    return this.storeEspIdfToolsStatus === StatusType.installed;
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }
}
</script>

<style scoped>
.pkg-progress {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
  align-self: center;
}

.progressBar {
  width: 70%;
  display: flex;
}

.progressStatus {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.progressStatus:hover {
  background-color: var(--vscode-textBlockQuote-background);
}

.progressText {
  width: 100%;
  text-align: end;
}
</style>
