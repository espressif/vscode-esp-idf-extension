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
      <div class="control barText" v-if="espIdfErrorStatus">
        <p class="label" data-config-id="esp-idf-download-status">
          {{ espIdfErrorStatus }}
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
