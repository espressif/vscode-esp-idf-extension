<template>
  <div :key="tool.id" class="pkg-progress">
    <div class="progressText">
      <span>Tool:</span>
      {{ tool.id }}
      <br />
      <span>Version:</span>
      {{ tool.expected }}
      <br />
      <span v-if="tool.progress === '100.00%'">
        <span>Checksum :</span>
        {{ tool.hashResult ? "OK" : "Invalid" }}
      </span>
      <span v-if="tool.hasFailed">Download again</span>
    </div>
    <div class="progressBar">
      <p v-if="tool.progress !== '100.00%'">
        <span>Download Status:</span>
        {{ tool.progress }}
        {{ tool.progressDetail }}
      </p>
      <div
        v-bind:style="{ width: tool.progress }"
        v-if="tool.progress !== '100.00%'"
      ></div>
      <p v-if="tool.progress === '100.00%' && !isInstallationCompleted">
        <span>Extracting {{ tool.id }}...</span>
      </p>
      <p v-if="tool.progress === '100.00%' && isInstallationCompleted">
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
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { IEspIdfTool } from "../../types";

@Component
export default class ToolDownloadInfo extends Vue {
  @Prop() tool: IEspIdfTool;
  @State("toolsFolder") private storeIdfToolsPath;
  @State("isInstalled") private storeIsInstallationCompleted;

  get idfTools() {
    return this.storeIdfToolsPath;
  }

  get isInstallationCompleted() {
    return this.storeIsInstallationCompleted;
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }
}
</script>

<style scoped>
.pkg-progress {
  margin-top: 1%;
  display: flex;
  justify-content: space-around;
  flex-direction: row;
  width: 50%;
  align-items: center;
  align-self: center;
}

.progressText {
  width: 45%;
  display: flex;
  flex-direction: column;
}

.progressBar {
  width: 50%;
}

.progressBar div {
  background-color: var(--vscode-button-background);
  height: 10px;
  width: 0%;
}
</style>
