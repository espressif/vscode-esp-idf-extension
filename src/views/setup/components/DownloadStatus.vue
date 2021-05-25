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
        ><span>Installed in {{ destPath }}</span></span
      >
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { IDownload, StatusType } from "../types";

@Component
export default class DownloadStatus extends Vue {
  @Prop() private downloadStatus: IDownload;
  @Prop() private name: string;
  @Prop() private status: StatusType;
  @Prop() private destPath: string;

  get isInstallationCompleted() {
    return this.status === StatusType.installed;
  }
}
</script>

<style scoped>
.progress {
  width: 50%;
  flex-direction: column;
  height: 100%;
}
</style>
