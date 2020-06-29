<template>
  <div id="download-window" class="section">
    <div v-if="selected === 'empty'" class="container centerize">
      <router-link
        to="/"
        class="arrow go-back right"
        v-on:click.native="updateChecksView(false)"
      ></router-link>
      <h4 class="title">{{ msge }}</h4>
      <div class="field">
        <label for="idf-version-select" class="label"
          >Select ESP-IDF version:</label
        >
        <div class="control">
          <select v-model="selectedIdfVersion" class="select">
            <option v-for="ver in idfVersionList" :key="ver.name" :value="ver">
              {{ ver.name }}
            </option>
          </select>
        </div>
      </div>
      <IDFManual
        v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
      />
      <div v-else class="field">
        <label class="label"
          >Select directory to download and install ESP-IDF. <br />(Result
          directory will be {{ resultingIdfPath }})</label
        >
        <div class="field has-addons has-addons-centered">
          <div class="control">
            <input type="text" class="input" v-model="idfDownloadPath" />
          </div>
          <p class="control">
            <a class="button is-static"> {{ pathSep }}esp-idf </a>
          </p>
          <div class="control">
            <font-awesome-icon
              :icon="folderIcon"
              class="open-icon"
              @mouseover="folderIcon = 'folder-open'"
              @mouseout="folderIcon = 'folder'"
              v-on:click="openFolder"
            />
          </div>
        </div>
        <div class="field centerize">
          <div class="control">
            <button v-on:click="downloadEspIdf" class="button">
              Click here to download
            </button>
          </div>
        </div>
      </div>
    </div>
    <IDFDownload v-if="selected === 'download'" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IEspIdfLink, IEspIdfStatus } from "./store/types";
import IDFDownload from "./components/IDFDownload.vue";
import IDFManual from "./components/IDFManual.vue";

@Component({
  components: {
    IDFDownload,
    IDFManual,
  },
})
export default class Download extends Vue {
  public msge: string = "Configure ESP-IDF";
  public folderIcon = "folder";
  @State("idfDownloadPath") private storeIdfDownloadPath: string;
  @State("idfVersionList") private storeIdfVersionList: IEspIdfLink[];
  @State("selectedIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("idfDownloadState") private storeIdfDownloadState: string;
  @Mutation private setIdfDownloadPath;
  @Mutation private setSelectedIdfVersion;
  @Action private downloadEspIdf;
  @Action("openEspIdfFolder") private openFolder;

  // Manual Setup
  @Mutation("showIdfPathCheck") private updateChecksView;

  get idfDownloadPath() {
    return this.storeIdfDownloadPath;
  }
  set idfDownloadPath(newPath: string) {
    this.setIdfDownloadPath(newPath);
  }

  get idfVersionList() {
    return this.storeIdfVersionList;
  }

  get pathSep() {
    return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
  }

  get resultingIdfPath() {
    const sepPath = navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
    return this.idfDownloadPath + sepPath + "esp-idf";
  }

  get selectedIdfVersion() {
    return this.storeSelectedIdfVersion;
  }
  set selectedIdfVersion(selectedVersion: IEspIdfLink) {
    this.setSelectedIdfVersion(selectedVersion);
    this.updateChecksView(false);
  }

  get selected() {
    return this.storeIdfDownloadState;
  }
}
</script>

<style></style>
