<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSetupStore } from "../store";
import { IdfMirror } from "../types";
import folderOpen from "./folderOpen.vue";
import { computed, watchEffect, watch } from "vue";

const store = useSetupStore();

const idfMirror = computed(() => {
  return IdfMirror;
});

const {
  espIdf,
  espIdfContainer,
  espIdfVersionList,
  espIdfTags,
  selectedEspIdfVersion,
  selectedIdfMirror,
  showIdfTagList,
  whiteSpaceErrorIDFContainer,
  idfPathError,
  isInstallButtonDisabled,
} = storeToRefs(store);

const idfVersionList = computed(() => {
  if (showIdfTagList.value) {
    const idfVersionWithTagsList = [...espIdfVersionList.value];
    for (const idfTag of espIdfTags.value) {
      const existingVersion = espIdfVersionList.value.find(
        (idfVersion) => idfVersion.name === idfTag.name
      );
      if (!existingVersion) {
        idfVersionWithTagsList.push(idfTag);
      }
    }
    return idfVersionWithTagsList;
  }
  return espIdfVersionList.value;
});

function clearIDfErrorStatus() {
  store.espIdfErrorStatus = "";
  store.whiteSpaceErrorIDFContainer = "";
  store.idfPathError = "";
}

function setEspIdfPath(idfPath: string) {
  store.espIdf = idfPath;
}

function setEspIdfContainerPath(idfContainerPath: string) {
  store.espIdfContainer = idfContainerPath;
}

function validatePathOnBlur(path: string) {
  if (selectedEspIdfVersion.value.filename === "manual") {
    store.validateEspIdfPath(path);
  }
}

const resultingIdfPath = computed(() => {
  return `${selectedEspIdfVersion.value.version.replace("release/", "")}${
    store.pathSep
  }esp-idf`;
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

const isPathEmpty = computed(() => {
  if (selectedEspIdfVersion.value.filename === "manual") {
    return !espIdf.value;
  } else {
    return !espIdfContainer.value;
  }
});

watchEffect(() => {
  if (!hasWhitespaceInEspIdf.value) {
    store.whiteSpaceErrorIDF = "";
  }
  if (!hasWhitespaceInEspIdfContainer.value) {
    store.whiteSpaceErrorIDFContainer = "";
  }
});

watch(selectedEspIdfVersion, (newVal) => {
  clearIDfErrorStatus();
  validatePathOnBlur(newVal.filename === "manual" ? espIdf.value : espIdfContainer.value);
});
</script>

<template>
  <div id="select-esp-idf-version">
    <div class="field">
      <label for="idf-mirror-select" class="label"
        >Select download server:</label
      >
      <div class="control">
        <div class="select">
          <select v-model="selectedIdfMirror" @change="clearIDfErrorStatus">
            <option :value="idfMirror.Espressif">Espressif</option>
            <option :value="idfMirror.Github">Github</option>
          </select>
        </div>
      </div>
    </div>
    <div class="field">
      <label class="checkbox is-small">
        <input type="checkbox" v-model="showIdfTagList" />
        Show all ESP-IDF tags
      </label>
    </div>
    <div class="field">
      <label for="idf-version-select" class="label"
        >Select ESP-IDF version:</label
      >
      <div class="control">
        <div class="select">
          <select
            v-model="selectedEspIdfVersion"
            @change="clearIDfErrorStatus"
            id="select-esp-idf"
          >
            <option
              v-for="ver in idfVersionList"
              :key="ver.name"
              :value="ver"
              >{{ ver.name }}</option
            >
          </select>
        </div>
      </div>
    </div>
    <folderOpen
      propLabel="Enter ESP-IDF directory (IDF_PATH):"
      :propModel.sync="espIdf"
      :propMutate="setEspIdfPath"
      :openMethod="store.openEspIdfFolder"
      :onChangeMethod="clearIDfErrorStatus"
      @blur="validatePathOnBlur"
      v-if="
        selectedEspIdfVersion && selectedEspIdfVersion.filename === 'manual'
      "
      data-config-id="manual-idf-directory"
    />
    <folderOpen
      propLabel="Enter ESP-IDF container directory:"
      :propModel.sync="espIdfContainer"
      :propMutate="setEspIdfContainerPath"
      :openMethod="store.openEspIdfContainerFolder"
      :onChangeMethod="clearIDfErrorStatus"
      :staticText="resultingIdfPath"
      @blur="validatePathOnBlur"
      v-if="
        selectedEspIdfVersion && selectedEspIdfVersion.filename !== 'manual'
      "
    />
    <div
      v-if="
        selectedEspIdfVersion &&
        selectedEspIdfVersion.filename !== 'manual' &&
        isVersionLessThanFive &&
        hasWhitespaceInEspIdfContainer
      "
      class="notification is-danger"
    >
      White spaces are only supported for ESP-IDF path for versions >= 5.0.
    </div>
    <div v-if="isPathEmpty" class="notification is-danger">
      ESP-IDF path should not be empty.
    </div>
    <div v-if="idfPathError" class="notification is-danger">
      {{ idfPathError }}
    </div>
  </div>
</template>

<style scoped>
#select-esp-idf-version {
  margin: 0.25em;
}
.checkbox:hover {
  color: var(--vscode-button-background);
}
</style>
