<script setup lang="ts">
import toolDownload from "../toolDownload.vue";
import { StatusType } from "../../types";
import { useSetupStore  } from "../../store";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import {
  IconCheck,
  IconClose,
  IconLoading,
} from "@iconify-prerendered/vue-codicon";

const store = useSetupStore();
const { toolsResults, statusEspIdfTools } = storeToRefs(store);

const statusType = computed(() => {
  return StatusType;
});
</script>

<template>
  <div class="centerize notification">
    <div class="control barText">
      <p class="label">Installing ESP-IDF Tools...</p>
      <div class="icon is-large is-size-4">
        <IconCheck v-if="statusEspIdfTools === statusType.installed" />
        <IconClose v-if="statusEspIdfTools === statusType.failed" />
        <IconLoading
          v-if="
            statusEspIdfTools !== statusType.installed &&
            statusEspIdfTools !== statusType.failed
          "
          class="gear"
        />
      </div>
    </div>
    <div class="toolsSection" v-if="statusEspIdfTools !== statusType.pending">
      <toolDownload v-for="tool in toolsResults" :key="tool.id" :tool="tool" />
    </div>
  </div>
</template>

<style scoped>
.toolsSection {
  display: flex;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
}
</style>