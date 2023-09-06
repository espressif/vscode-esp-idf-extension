<script setup lang="ts">
import { computed } from "vue";
import { useSetupStore } from "../../store";
import { StatusType } from "../../types";
import DownloadStatus from "../DownloadStatus.vue";
import { storeToRefs } from "pinia";
import { Icon } from "@iconify/vue";

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
  <div class="centerize notification">
    <div class="control barText">
      <p class="label">Installing ESP-IDF...</p>
      <div class="icon is-large is-size-4">
        <Icon
          :icon="
            statusEspIdf === statusType.installed
              ? 'check'
              : statusEspIdf === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusEspIdf !== statusType.installed &&
              statusEspIdf !== statusType.failed,
          }"
        />
      </div>
    </div>
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
        <Icon
          :icon="
            statusEspIdf === statusType.installed
              ? 'check'
              : statusEspIdf === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusEspIdf !== statusType.installed &&
              statusEspIdf !== statusType.failed,
          }"
        />
      </div>
    </div>
  </div>
</template>
