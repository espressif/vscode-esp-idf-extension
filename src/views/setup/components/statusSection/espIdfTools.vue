<script setup lang="ts">
import toolDownload from "../toolDownload.vue";
import { StatusType } from "../../types";
import { useSetupStore  } from "../../store";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { Icon } from "@iconify/vue";

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
        <Icon
          :icon="
            statusEspIdfTools === statusType.installed
              ? 'check'
              : statusEspIdfTools === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusEspIdfTools !== statusType.installed &&
              statusEspIdfTools !== statusType.failed,
          }"
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