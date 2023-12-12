<script setup lang="ts">
import DownloadStatus from "../DownloadStatus.vue";
import { StatusType } from "../../types";
import { useSetupStore } from "../../store";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import {
  IconCheck,
  IconClose,
  IconLoading,
} from "@iconify-prerendered/vue-codicon";

const store = useSetupStore();
const {
  idfGitDownloadStatus,
  idfPythonDownloadStatus,
  pathSep,
  statusIdfGit,
  statusIdfPython,
  toolsFolder,
} = storeToRefs(store);

const statusType = computed(() => {
  return StatusType;
});

const isWinPlatform = computed(() => {
  return pathSep.value.indexOf("\\") !== -1;
});

const toolsDestPath = computed(() => {
  return `${toolsFolder}${pathSep}tools${pathSep}`;
});
</script>

<template>
  <div
    class="centerize notification"
    v-if="isWinPlatform"
    @click="store.toggleContent('prerequisites')"
  >
    <div class="control barText">
      <p class="label">Installing ESP-IDF Prerequisites...</p>
      <div class="icon is-large is-size-4">
        <IconCheck
          v-if="
            statusIdfGit === statusType.installed &&
            statusIdfPython === statusType.installed
          "
        />
        <IconClose
          v-if="
            statusIdfGit === statusType.failed &&
            statusIdfPython === statusType.failed
          "
        />
        <IconLoading
          v-if="
            statusIdfGit !== statusType.installed &&
            statusIdfGit !== statusType.failed &&
            statusIdfPython !== statusType.installed &&
            statusIdfPython !== statusType.failed
          "
          class="gear"
        />
      </div>
    </div>
    <div id="prerequisites">
      <DownloadStatus
        name="IDF-Git"
        :downloadStatus="idfGitDownloadStatus"
        :destPath="toolsDestPath + 'idf-git'"
        :status="statusIdfGit"
      />
      <DownloadStatus
        name="IDF-Python"
        :downloadStatus="idfPythonDownloadStatus"
        :destPath="toolsDestPath + 'idf-python'"
        :status="statusIdfPython"
      />
    </div>
  </div>
</template>
