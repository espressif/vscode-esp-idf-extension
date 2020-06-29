<template>
  <div class="field centerize">
    <label class="label">Enter ESP-IDF directory</label>
    <div class="field has-addons">
      <div class="control">
        <input
          type="text"
          class="input"
          v-model="idfPath"
          @input="launchCheckPath"
        />
      </div>
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
    <div class="field">
      <div class="control">
        <button v-on:click="launchCheckPath" class="button">
          Click here to check if is valid
        </button>
      </div>
    </div>
    <div
      v-if="showIdfPathCheck"
      class="field is-grouped"
      style="align-items: center;"
    >
      <div class="control icon is-small">
        <font-awesome-icon
          icon="check"
          v-if="doesIdfPathExist"
          class="check-icon"
        />
        <font-awesome-icon icon="times" v-else class="check-icon" />
      </div>
      <div class="control">
        <p>
          idf.py exists on the path. Detected ESP-IDF version:
          {{ idfVersion }}
        </p>
      </div>
    </div>
    <div v-if="doesIdfPathExist" class="field">
      <div class="control">
        <router-link
          to="/toolsetup"
          class="button"
          v-on:click.native="saveIdfPath"
          >Go to ESP-IDF Tools setup</router-link
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class IDFManual extends Vue {
  public folderIcon = "folder";
  @Action("openEspIdfFolder") private openFolder;
  @Action("checkIdfPath") private launchCheckPath;
  @Action("saveIdfPath") private saveIdfPath;
  @Mutation private setIdfPath;
  @Mutation("showIdfPathCheck") private updateChecksView;
  @State("doesIdfPathExist") private storeDoesIdfPathExist;
  @State("idfPath") private storeIdfPath: string;
  @State("idfVersion") private storeIdfVersion: string;
  @State("showIdfPathCheck") private storeShowIdfPathCheck: boolean;

  get doesIdfPathExist() {
    return this.storeDoesIdfPathExist;
  }
  get idfPath() {
    return this.storeIdfPath;
  }
  set idfPath(newPath: string) {
    this.setIdfPath(newPath);
  }

  get idfVersion() {
    return this.storeIdfVersion;
  }

  get showIdfPathCheck() {
    return this.storeShowIdfPathCheck;
  }
  set showIdfPathCheck(val) {
    this.updateChecksView(val);
  }
}
</script>

<style scoped>
.check-element {
  display: inline-flex;
}
.check-element p {
  width: 28em;
}
</style>
