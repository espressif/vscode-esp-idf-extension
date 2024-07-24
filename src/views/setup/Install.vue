<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSetupStore } from "./store";
import { SetupMode } from "./types";
import { computed, watchEffect, onMounted, onUnmounted } from "vue";
import folderOpen from "./components/folderOpen.vue";
import selectEspIdf from "./components/selectEspIdf.vue";
import selectPyVersion from "./components/selectPyVersion.vue";
import { IconClose } from "@iconify-prerendered/vue-codicon";

const store = useSetupStore();

onMounted(() => {
  if (store.espIdf) {
    store.validateEspIdfPath(store.espIdf);
  } else if (store.espIdfContainer) {
    store.validateEspIdfPath(store.espIdfContainer);
  }
});

onUnmounted(() => {
  store.setIdfPathError("");
});

const {
  espIdfErrorStatus,
  gitVersion,
  pathSep,
  pyExecErrorStatus,
  toolsFolder,
  setupMode,
  selectedEspIdfVersion,
  espIdf,
  espIdfContainer,
  isInstallButtonDisabled,
} = storeToRefs(store);

const isNotWinPlatform = computed(() => {
  return pathSep.value.indexOf("/") !== -1;
});

const actionButtonText = computed(() => {
  return setupMode.value === SetupMode.advanced ? "Configure Tools" : "Install";
});

const hasToolsWhitespace = computed(() => {
  return /\s/.test(toolsFolder.value);
});

const isVersionLessThanFive = computed(() => {
  if (!selectedEspIdfVersion.value || !selectedEspIdfVersion.value.version) {
    return false;
  }

  const versionString = selectedEspIdfVersion.value.version.match(
    /(\d+\.\d+\.\d+|\d+\.\d+)/
  );
  if (!versionString) {
    return false;
  }

  const version = versionString[0].split(".").map((num) => parseInt(num));
  if (version[0] < 5) {
    return true;
  } else if (version[0] === 5 && version[1] === 0 && version[2] === 0) {
    return true;
  }

  return false;
});

const hasWhitespaceInEspIdf = computed(() => {
  return /\s/.test(espIdf.value);
});

const hasWhitespaceInEspIdfContainer = computed(() => {
  return /\s/.test(espIdfContainer.value);
});

const isInstallDisabled = computed(() => {
  return (
    hasToolsWhitespace.value ||
    (selectedEspIdfVersion.value.filename !== "manual" &&
      isVersionLessThanFive.value &&
      hasWhitespaceInEspIdfContainer.value) ||
    !espIdf.value ||
    !espIdfContainer.value ||
    !toolsFolder.value
  );
});

watchEffect(() => {
  if (!hasWhitespaceInEspIdf.value) {
    store.whiteSpaceErrorIDF = "";
  }
  if (!hasWhitespaceInEspIdfContainer.value) {
    store.whiteSpaceErrorIDFContainer = "";
  }
  if (!hasToolsWhitespace.value) {
    store.whiteSpaceErrorTools = "";
  }
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
    <div class="notification is-danger error-message" v-if="espIdfErrorStatus">
      <p>{{ espIdfErrorStatus }}</p>
      <div class="icon is-large is-size-4" @click="setEspIdfErrorStatus">
        <IconClose />
      </div>
    </div>

    <div class="notification is-danger error-message" v-if="pyExecErrorStatus">
      <p>{{ pyExecErrorStatus }}</p>
      <div class="icon is-large is-size-4" @click="setPyExecErrorStatus">
        <IconClose />
      </div>
    </div>

    <div class="notification">
      <div class="field" v-if="isNotWinPlatform && gitVersion">
        <label data-config-id="git-version"
          >Git version: {{ gitVersion }}</label
        >
      </div>

      <selectEspIdf />

      <folderOpen
        propLabel="Enter ESP-IDF Tools directory (IDF_TOOLS_PATH):"
        :propModel="toolsFolder"
        :propMutate="setToolsFolder"
        :openMethod="store.openEspIdfToolsFolder"
      />

      <div v-if="hasToolsWhitespace" class="notification is-danger">
        White spaces are not allowed in the ESP-IDF Tools path.
      </div>

      <div v-if="!toolsFolder" class="notification is-danger">
        ESP-IDF Tools path should not be empty.
      </div>

      <selectPyVersion v-if="isNotWinPlatform" />

      <div class="field install-btn">
        <div class="control">
          <button
            @click="store.installEspIdf"
            class="button"
            data-config-id="start-install-btn"
            :disabled="isInstallDisabled || store.isInstallButtonDisabled"
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
