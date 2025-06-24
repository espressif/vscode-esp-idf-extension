<script setup lang="ts">
import { computed } from "vue";
import { useSetupStore } from "../../store";
import { StatusType } from "../../types";
import DownloadStatus from "../DownloadStatus.vue";
import { storeToRefs } from "pinia";
import {
  IconCheck,
  IconClose,
  IconLoading,
} from "@iconify-prerendered/vue-codicon";

const store = useSetupStore();

const statusType = computed(() => {
  return StatusType;
});

const {
  espIdf,
  espIdfErrorStatus,
  idfDownloadStatus,
  isIdfInstalling,
  statusEspIdf,
} = storeToRefs(store);

// Computed property to determine if we should show the status message
const shouldShowStatusMessage = computed(() => {
  // Show if there's an error status message
  if (espIdfErrorStatus.value) {
    return true;
  }
  
  // Show if installation is complete (installed or failed)
  if (statusEspIdf.value === StatusType.installed || statusEspIdf.value === StatusType.failed) {
    return true;
  }
  
  // Show if we're not currently installing but have a status
  if (!isIdfInstalling.value && statusEspIdf.value !== StatusType.pending) {
    return true;
  }
  
  return false;
});

// Computed property to get the appropriate status message
const statusMessage = computed(() => {
  if (espIdfErrorStatus.value) {
    return espIdfErrorStatus.value;
  }
  
  if (statusEspIdf.value === StatusType.installed) {
    return `ESP-IDF installation completed successfully`;
  }
  
  if (statusEspIdf.value === StatusType.failed) {
    return `ESP-IDF installation failed`;
  }
  
  if (statusEspIdf.value === StatusType.started) {
    return `ESP-IDF installation in progress...`;
  }
  
  return "";
});
</script>

<template>
  <div class="centerize notification" @click="store.toggleContent('espidf')">
    <div class="control barText">
      <p class="label">Installing ESP-IDF...</p>
      <div class="icon is-large is-size-4">
        <IconCheck v-if="statusEspIdf === statusType.installed" />
        <IconClose v-if="statusEspIdf === statusType.failed" />
        <IconLoading
          v-if="
            statusEspIdf !== statusType.installed &&
            statusEspIdf !== statusType.failed
          "
          class="gear"
        />
      </div>
    </div>
    <div id="espidf">
      <DownloadStatus
        name="ESP-IDF"
        :downloadStatus="idfDownloadStatus"
        :destPath="espIdf"
        :status="statusEspIdf"
        v-if="isIdfInstalling"
        data-config-id="esp-idf-download-status"
      />
      <div class="control barText" v-if="shouldShowStatusMessage">
        <p class="label" data-config-id="esp-idf-download-status">
          {{ statusMessage }}
        </p>
        <div class="icon is-large is-size-4">
          <IconCheck v-if="statusEspIdf === statusType.installed" />
          <IconClose v-if="statusEspIdf === statusType.failed" />
          <IconLoading
            v-if="
              statusEspIdf !== statusType.installed &&
              statusEspIdf !== statusType.failed
            "
            class="gear"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#espidf {
  width: 100%;
  justify-content: center;
}
</style>
