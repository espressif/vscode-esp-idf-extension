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
  gitVersion,
  pathSep,
  pyExecErrorStatus,
  toolsFolder,
  setupMode,
  selectedEspIdfVersion,
  espIdf,
  espIdfContainer,
} = storeToRefs(store);

const errMsgIdf =
  "The ESP IDF folder path cannot contain spaces for ESP-IDF version lower than 5.0";
const errMsgTools =
  "The ESP Tools folder path cannot contain spaces for ESP-IDF version lower than 5.0";

const isNotWinPlatform = computed(() => {
  return pathSep.value.indexOf("/") !== -1;
});

const actionButtonText = computed(() => {
  return setupMode.value === SetupMode.advanced ? "Configure Tools" : "Install";
});

const isVersionLowerThan5 = computed(() => {
  const version = selectedEspIdfVersion.value.version;
  if (version) {
    const match = version.match(/v(\d+(\.\d+)?(\.\d+)?)/);
    if (match) {
      const versionNumber = parseFloat(match[1]);
      return versionNumber < 5;
    }
  }
  return false;
});

const whiteSpaceNotSupportedIdf = computed(() => {
  if (isVersionLowerThan5.value) {
    if (selectedEspIdfVersion.value.filename === "manual") {
      return espIdf.value.includes(" ");
    }
    if (selectedEspIdfVersion.value.filename !== "manual") {
      return espIdfContainer.value.includes(" ");
    }
  }
});

const whiteSpaceNotSupportedTools = computed(() => {
  if (isVersionLowerThan5.value) {
    return toolsFolder.value.includes(" ");
  }
});

const buttonTooltip = computed(() => {
  if (whiteSpaceNotSupportedIdf.value) {
    return errMsgIdf;
  } else if (whiteSpaceNotSupportedTools.value) {
    return errMsgTools;
  }
  return ""; // No tooltip when the button is not disabled
});

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
        v-if="whiteSpaceNotSupportedIdf"
      >
        <span>{{ errMsgIdf }}</span>
      </div>

      <folderOpen
        propLabel="Enter ESP-IDF Tools directory (IDF_TOOLS_PATH):"
        :propModel="toolsFolder"
        :propMutate="setToolsFolder"
        :openMethod="store.openEspIdfToolsFolder"
      />

      <div
        class="notification is-danger error-message"
        v-if="whiteSpaceNotSupportedTools"
      >
        <span>{{ errMsgTools }}</span>
      </div>

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
            :disabled="whiteSpaceNotSupportedIdf || whiteSpaceNotSupportedTools"
            :title="buttonTooltip"
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
  display: inline-block;
  justify-content: space-between;
  align-items: center;
}

.error-message .icon:hover {
  color: var(--vscode-button-foreground);
}
</style>
