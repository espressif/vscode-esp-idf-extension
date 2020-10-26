<template>
  <div class="field centerize text-size">
    <label>Enter ESP-IDF directory</label>
    <div class="field is-grouped text-size">
      <div class="control is-expanded">
        <input
          type="text"
          class="input"
          v-model="idfPath"
          @input="launchCheckPath"
        />
      </div>
      <div class="control">
        <div class="icon is-large" style="text-decoration: none;">
          <i
            :class="folderIcon"
            @mouseover="folderIcon = 'codicon codicon-folder-opened'"
            @mouseout="folderIcon = 'codicon codicon-folder'"
            v-on:click="openFolder"
          ></i>
        </div>
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
      <div class="control">
        <div class="icon is-small">
          <i
            :class="
              doesIdfPathExist
                ? 'codicon codicon-check'
                : 'codicon codicon-close'
            "
          ></i>
        </div>
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
  public folderIcon = "codicon codicon-folder";
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
