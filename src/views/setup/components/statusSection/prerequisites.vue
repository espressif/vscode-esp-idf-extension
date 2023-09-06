<script setup lang="ts">
import DownloadStatus from "../DownloadStatus.vue";
import { StatusType } from "../../types";
import { useSetupStore } from "../../store";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { Icon } from "@iconify/vue";

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
  <div class="centerize notification" v-if="isWinPlatform">
    <div class="control barText">
      <p class="label">Installing IDF Prerequisites...</p>
      <div class="icon is-large is-size-4">
        <Icon
          :icon="
            statusIdfGit === statusType.installed &&
            statusIdfPython === statusType.installed
              ? 'check'
              : statusIdfGit === statusType.failed &&
                statusIdfPython === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusIdfGit !== statusType.installed &&
              statusIdfGit !== statusType.failed &&
              statusIdfPython !== statusType.installed &&
              statusIdfPython !== statusType.failed,
          }"
        />
      </div>
    </div>
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
</template>
