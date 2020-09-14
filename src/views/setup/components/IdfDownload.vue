<template>
  <div class="centerize">
    <h4>ESP-IDF: {{ idfDownloadStatus.id }}</h4>
    <div class="progressBar esp-progress">
      <p>
        <span>Downloaded: </span> {{ idfDownloadStatus.progress }}
        {{ idfDownloadStatus.progressDetail }}
      </p>
      <div v-bind:style="{ width: idfDownloadStatus.progress }"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { IDownload } from "../types";

@Component
export default class IdfDownload extends Vue {
  @State("idfDownloadStatus") private storeIdfDownloadStatus: IDownload;

  get idfDownloadStatus() {
    return this.storeIdfDownloadStatus;
  }
}
</script>

<style scoped>
.esp-progress {
  width: 50%;
  flex-direction: column;
}
</style>
