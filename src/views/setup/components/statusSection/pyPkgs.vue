<script setup lang="ts">
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

const { pyReqsLog, statusPyVEnv } = storeToRefs(store);

const statusType = computed(() => {
  return StatusType;
});
</script>

<template>
  <div class="centerize notification">
    <div class="control barText">
      <p class="label">
        Installing Python virtual environment for ESP-IDF...
      </p>
      <div class="icon is-large is-size-4">
        <IconCheck v-if="statusPyVEnv === statusType.installed" />
        <IconClose v-if="statusPyVEnv === statusType.failed" />
        <IconLoading
          v-if="
            statusPyVEnv !== statusType.installed &&
            statusPyVEnv !== statusType.failed
          "
          class="gear"
        />
      </div>
    </div>
    <div
      class="field"
      v-if="statusPyVEnv !== statusType.installed"
    >
      <p id="python-log" class="notification">{{ store.pyReqsLog }}</p>
    </div>
  </div>
</template>
