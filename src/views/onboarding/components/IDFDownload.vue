<template>
  <div class="idf-download-step">
    <i
      v-on:click="setSelectedIdfDownloadState('empty')"
      class="arrow go-back right"
    ></i>
    <h4>ESP-IDF: {{ idfDownloadStatus.id }}</h4>
    <div class="progressBar">
      <p>
        <span>Downloaded: </span> {{ idfDownloadStatus.progress }}
        {{ idfDownloadStatus.progressDetail }}
      </p>
      <div v-bind:style="{ width: idfDownloadStatus.progress }"></div>
    </div>
    <div v-if="downloadedPath !== '' && downloadedPath !== 'master'">
      <p v-if="downloadedPath !== 'master'">
        ESP-IDF zip file has been downloaded in {{ downloadedPath }}
      </p>
      <p v-if="!isIDFZipExtracted">Extracting {{ downloadedPath }} ...</p>
    </div>
    <div v-if="isIDFZipExtracted">
      <p>ESP-IDF has been installed in {{ resultingIdfPath }}</p>
      <br />
      <router-link to="/toolsetup" class="button" v-on:click.native="reset"
        >Go to ESP-IDF Tools setup</router-link
      >
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IEspIdfStatus } from "../store/types";

@Component
export default class IDFDownload extends Vue {
  @Mutation private setSelectedIdfDownloadState;
  @Mutation private setIdfDownloadPath;
  @Mutation private setIsIDFZipExtracted;
  @Mutation private setDownloadedZipPath;
  @Mutation("showIdfPathCheck") private updateChecksView;
  @State("downloadedIdfZipPath") private storeDownloadedIdfZipPath: string;
  @State("idfDownloadPath") private storeIdfDownloadPath: string;
  @State("idfDownloadStatus") private storeIdfDownloadStatus: IEspIdfStatus;
  @State("isIDFZipExtracted") private storeIsIDFZipExtracted: boolean;

  get downloadedPath() {
    return this.storeDownloadedIdfZipPath;
  }

  get idfDownloadPath() {
    return this.storeIdfDownloadPath;
  }
  set idfDownloadPath(newPath: string) {
    this.setIdfDownloadPath(newPath);
  }

  get idfDownloadStatus() {
    return this.storeIdfDownloadStatus;
  }

  get isIDFZipExtracted() {
    return this.storeIsIDFZipExtracted;
  }

  get resultingIdfPath() {
    const pathSep = navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
    return this.idfDownloadPath + pathSep + "esp-idf";
  }

  public reset() {
    this.setIsIDFZipExtracted(false);
    this.setDownloadedZipPath("");
    this.setSelectedIdfDownloadState("empty");
    this.updateChecksView(false);
  }
}
</script>

<style scoped>
.idf-download-step {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
