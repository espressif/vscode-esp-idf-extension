<script setup lang="ts">
import { computed } from "vue";
import { IDownload, StatusType } from "../types";

const props = defineProps<{
  name: string;
  destPath: string;
  downloadStatus: IDownload;
  status: StatusType;
}>();

const isInstallationCompleted = computed(() => {
  return props.status === StatusType.installed;
});
</script>

<template>
  <div class="centerize">
    <h4>{{ name }}: {{ downloadStatus.id }}</h4>
    <p v-if="downloadStatus.progress !== '100.00%'">
      <span>Downloaded: </span> {{ downloadStatus.progress }}
      {{ downloadStatus.progressDetail }}
    </p>
    <div
      class="progressBar progress"
      v-if="downloadStatus.progress !== '100.00%'"
    >
      <div v-bind:style="{ width: downloadStatus.progress }"></div>
    </div>
    <div class="progressText">
      <span
        v-if="downloadStatus.progress === '100.00%' && !isInstallationCompleted"
        ><span>Extracting {{ downloadStatus.id }}</span></span
      >
      <span
        v-if="downloadStatus.progress === '100.00%' && isInstallationCompleted"
        ><span data-config-id="download-status-installed"
          >Installed in {{ destPath }}</span
        ></span
      >
    </div>
  </div>
</template>

<style scoped>
.progress {
  width: 50%;
  flex-direction: column;
  height: 100%;
}
</style>
