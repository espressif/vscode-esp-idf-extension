<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSetupStore } from "../store";
import { computed } from "vue";
import { IEspIdfTool, StatusType } from "../types";

const store = useSetupStore();

const { pathSep, toolsFolder, statusEspIdfTools } = storeToRefs(store);

const isInstallationCompleted = computed(() => {
  return statusEspIdfTools.value === StatusType.installed;
});

const props = defineProps<{
  tool: IEspIdfTool;
}>();
</script>

<template>
  <div class="progressStatus">
    <div :key="tool.id" class="pkg-progress">
      <strong>{{ tool.id }}</strong> <em>{{ tool.expected }}</em>
      <div class="progressBar">
        <div v-bind:style="{ width: tool.progress }"></div>
      </div>
    </div>
    <div class="progressText">
      <span v-if="tool.progress === '100.00%' && isInstallationCompleted">
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
          toolsFolder +
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
  margin: 0.5em;
  padding: 0.25em;
  border-color: var(--vscode-button-hoverBackground);
  border: 1px solid;
  border-radius: 4px;
}

.progressStatus:hover {
  background-color: var(--vscode-textBlockQuote-background);
}

.progressText {
  width: 100%;
  text-align: end;
}
</style>
