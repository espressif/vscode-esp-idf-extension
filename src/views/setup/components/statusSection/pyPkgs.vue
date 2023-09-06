<script setup lang="ts">
import { StatusType } from "../../types";
import { useSetupStore } from "../../store";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { Icon } from "@iconify/vue";

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
        <Icon
          :icon="
            statusPyVEnv === statusType.installed
              ? 'check'
              : statusPyVEnv === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusPyVEnv !== statusType.installed &&
              statusPyVEnv !== statusType.failed,
          }"
        />
      </div>
    </div>
    <div
      class="field"
      v-if="pyReqsLog && statusPyVEnv !== statusType.installed"
    >
      <p id="python-log" class="notification">{{ pyReqsLog }}</p>
    </div>
  </div>
</template>
