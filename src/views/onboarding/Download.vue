<template>
  <div id="download-window">
    <transition name="fade" mode="out-in">
      <div v-if="selected === 'empty'">
        <router-link
          to="/"
          class="arrow go-back right"
          v-on:click.native="updateChecksView(false)"
        ></router-link>
        <h4>{{ msge }}</h4>
        <label for="idf-version-select">Select ESP-IDF version:</label>
        <br />
        <br />
        <select v-model="selectedIdfVersion">
          <option v-for="ver in idfVersionList" :key="ver.name" :value="ver">
            {{ ver.name }}
          </option>
        </select>
        <br /><br />
        <IDFManual
          v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
        />
        <div v-else>
          <label
            >Select directory to download and install ESP-IDF. <br />(Result
            directory will be {{ resultingIdfPath }})</label
          >
          <br /><br />
          <input type="text" class="text-size" v-model="idfDownloadPath" />
          <font-awesome-icon
            :icon="folderIcon"
            class="open-icon"
            @mouseover="folderIcon = 'folder-open'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openFolder"
          />
          <br />
          <button v-on:click="downloadEspIdf" class="onboarding-button">
            Click here to download
          </button>
        </div>
      </div>
      <IDFDownload v-if="selected === 'download'" />
    </transition>
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
  @State("downloadedIdfZipPath") private storeDownloadedIdfZipPath: string;
  @State("idfDownloadPath") private storeIdfDownloadPath: string;
  @State("idfVersionList") private storeIdfVersionList: IEspIdfLink[];
  @State("selectedIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("idfDownloadState") private storeIdfDownloadState: string;
  @Mutation private setIdfDownloadPath;
  @Mutation private setSelectedIdfVersion;
  @Mutation private setDownloadedZipPath;
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

  get resultingIdfPath() {
    const pathSep = navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
    return this.idfDownloadPath + pathSep + "esp-idf";
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
