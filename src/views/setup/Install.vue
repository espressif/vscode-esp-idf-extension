<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSetupStore } from "./store";
import { SetupMode } from "./types";
import { computed } from "vue";
import folderOpen from "./components/folderOpen.vue";
import selectEspIdf from "./components/selectEspIdf.vue";
import selectPyVersion from "./components/selectPyVersion.vue";
import { IconClose } from "@iconify-prerendered/vue-codicon";

const store = useSetupStore();

const {
  espIdfErrorStatus,
  gitVersion,
  pathSep,
  pyExecErrorStatus,
  toolsFolder,
  setupMode,
} = storeToRefs(store);

const isNotWinPlatform = computed(() => {
  return pathSep.value.indexOf("/") !== -1;
});

const actionButtonText = computed(() => {
  return setupMode.value === SetupMode.advanced ? "Configure Tools" : "Install";
});

function setEspIdfErrorStatus() {
  store.espIdfErrorStatus = "";
}

function setPyExecErrorStatus() {
  store.pyExecErrorStatus = "";
}

function setToolsFolder(newToolsPath: string) {
  store.toolsFolder = newToolsPath;
}
</script>

<template>
  <div id="install">
    <div class="notification">
      <div class="field" v-if="isNotWinPlatform && gitVersion">
        <label data-config-id="git-version"
          >Git version: {{ gitVersion }}</label
        >
      </div>

      <selectEspIdf></selectEspIdf>

      <div
        class="notification is-danger error-message"
        v-if="espIdfErrorStatus"
      >
        <p>{{ espIdfErrorStatus }}</p>
        <div class="icon is-large is-size-4" @click="setEspIdfErrorStatus">
          <IconClose />
        </div>
      </div>

      <folderOpen
        propLabel="Enter ESP-IDF Tools directory (IDF_TOOLS_PATH):"
        :propModel="toolsFolder"
        :propMutate="setToolsFolder"
        :openMethod="store.openEspIdfToolsFolder"
      />

      <selectPyVersion v-if="isNotWinPlatform"></selectPyVersion>

      <div
        class="notification is-danger error-message"
        v-if="pyExecErrorStatus"
      >
        <p>{{ pyExecErrorStatus }}</p>
        <div class="icon is-large is-size-4" @click="setPyExecErrorStatus">
          <IconClose />
        </div>
      </div>

      <div class="field install-btn">
        <div class="control">
          <button
            @click="store.installEspIdf"
            class="button"
            data-config-id="start-install-btn"
          >
            {{ actionButtonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#install {
  margin: 1% 5%;
}

.error-message {
  padding: 0.5em;
  margin: 0.5em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message .icon:hover {
  color: var(--vscode-button-foreground);
}
</style>
