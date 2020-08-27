<template>
  <div class="centerize">
    <h4>ESP-IDF: {{ idfDownloadStatus.id }}</h4>
    <div class="progressBar">
      <p>
        <span>Downloaded: </span> {{ idfDownloadStatus.progress }}
        {{ idfDownloadStatus.progressDetail }}
      </p>
      <div v-bind:style="{ width: idfDownloadStatus.progress }"></div>
    </div>
    <div class="field">
      <div class="control">
        <router-link to="/autoinstall" class="button" @click="cancelIdfDownload"
          >Cancel download</router-link
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { IDownload } from "../../types";

@Component
export default class IdfDownload extends Vue {
  @State("idfDownloadStatus") private storeIdfDownloadStatus: IDownload;
  @Action cancelIdfDownload;

  get idfDownloadStatus() {
    return this.storeIdfDownloadStatus;
  }
}
</script>
