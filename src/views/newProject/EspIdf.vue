<template>
  <div id="espidf">
    <p class="title">Configure ESP-IDF and ESP-IDF Tools</p>
    <div v-if="idfVersions && idfVersions.length > 0" class="field">
      <label for="idf-version">Select ESP-IDF version:</label>
      <div class="control">
        <select
          v-model="selectedIdfVersion"
          id="idf-version"
          class="select is-fullwidth"
        >
          <option v-for="ver in idfVersions" :key="ver.id" :value="ver">{{
            ver.path
          }}</option>
        </select>
      </div>
      <p class="highlight">
        Selected ESP-IDF Path version: {{ idfPathVersion }}
      </p>
    </div>
    <div v-if="pyVenvList && pyVenvList.length > 0" class="field">
      <label for="idf-version">Select Python virtual environment:</label>
      <div class="control">
        <select v-model="selectedVenv" class="select is-fullwidth">
          <option v-for="venv in pyVenvList" :key="venv.id" :value="venv">{{
            venv.path
          }}</option>
        </select>
      </div>
    </div>
    <div v-if="toolsInMetadata && toolsInMetadata.length > 0" class="field">
      <tool v-for="tool in toolsInMetadata" :tool.sync="tool" :key="tool.id" />
      <div class="field is-grouped is-grouped-centered">
        <div class="control">
          <router-link to="/examples" class="button" v-if="isValid"
            >Choose template</router-link
          >
          <button v-else v-on:click="checkToolsAreValid" class="button">
            Check settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { State, Action, Mutation } from "vuex-class";
import { IPath, ITool } from "../../ITool";

@Component
export default class Espidf extends Vue {
  @State("idfPathVersion") private storeIdfPathVersion: string;
  @State("idfVersions") private storeIdfVersions: IPath[];
  @State("isValid") private storeIsValid: boolean;
  @State("pyVenvList") private storePyVenvList: IPath[];
  @State("selectedIdfVersion") private storeSelectedIdfVersion: IPath;
  @State("selectedVenv") private storeSelectedVenv: IPath;
  @State("toolsInMetadata") private storeToolsInMetadata: ITool[];
  @Action private requestInitValues;
  @Action("checkIsValid") private checkToolsAreValid;
  @Action private getIdfVersion;
  @Mutation private setSelectedIdf;
  @Mutation private setSelectedVenv;

  get idfPathVersion() {
    return this.storeIdfPathVersion;
  }
  get idfVersions() {
    return this.storeIdfVersions;
  }
  get isValid() {
    return this.storeIsValid;
  }
  get selectedIdfVersion() {
    return this.storeSelectedIdfVersion;
  }
  set selectedIdfVersion(val) {
    this.setSelectedIdf(val);
    this.getIdfVersion(val);
  }

  get pyVenvList() {
    return this.storePyVenvList;
  }

  get selectedVenv() {
    return this.storeSelectedVenv;
  }
  set selectedVenv(newVenv) {
    this.setSelectedVenv(newVenv);
  }

  get toolsInMetadata() {
    return this.storeToolsInMetadata;
  }

  private mounted() {
    this.requestInitValues();
  }
}
</script>

<style scoped>
#espidf {
  width: 50%;
}
</style>
