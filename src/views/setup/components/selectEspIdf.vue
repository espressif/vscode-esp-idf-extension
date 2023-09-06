<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSetupStore } from "../store";
import { IdfMirror, IEspIdfLink } from "../types";
import folderOpen from "./folderOpen.vue";
import { computed } from "vue";

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
} = storeToRefs(store);

const idfVersionList = computed(() => {
  if (showIdfTagList) {
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
}

function setEspIdfPath(idfPath: string) {
  store.espIdf = idfPath;
}

function setEspIdfContainerPath(idfContainerPath: string) {
  store.espIdfContainer = idfContainerPath;
}
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
      propLabel="Enter ESP-IDF directory (IDF_PATH)"
      :propModel.sync="espIdf"
      :propMutate="setEspIdfPath"
      :openMethod="store.openEspIdfFolder"
      :onChangeMethod="clearIDfErrorStatus"
      v-if="
        selectedEspIdfVersion && selectedEspIdfVersion.filename === 'manual'
      "
      data-config-id="manual-idf-directory"
    />
    <folderOpen
      propLabel="Enter ESP-IDF container directory"
      :propModel.sync="espIdfContainer"
      :propMutate="setEspIdfContainerPath"
      :openMethod="store.openEspIdfContainerFolder"
      :onChangeMethod="clearIDfErrorStatus"
      staticText="esp-idf"
      v-if="
        selectedEspIdfVersion && selectedEspIdfVersion.filename !== 'manual'
      "
    />
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
