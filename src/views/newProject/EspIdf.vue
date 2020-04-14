<template>
  <div id="espidf">
    <div v-if="idfVersions && idfVersions.length > 0">
      <label for="idf-version">Select ESP-IDF version:</label>
      <br />
      <br />
      <select v-model="selectedIdfVersion" id="idf-version">
        <option v-for="ver in idfVersions" :key="ver.id" :value="ver">{{
          ver.path
        }}</option>
      </select>
      <br />
      <p>Selected ESP-IDF Path version: {{ idfPathVersion }}</p>
      <br />
    </div>
    <div v-if="pyVenvList && pyVenvList.length > 0">
      <label for="idf-version">Select Python virtual environment:</label>
      <br />
      <br />
      <select v-model="selectedVenv">
        <option v-for="venv in pyVenvList" :key="venv.id" :value="venv">{{
          venv.path
        }}</option>
      </select>
      <br />
      <br />
    </div>
    <div v-if="toolsInMetadata && toolsInMetadata.length > 0">
      <tool v-for="tool in toolsInMetadata" :tool.sync="tool" :key="tool.id" />
      <br />
      <br />
      <router-link to="/examples" class="button" v-if="isValid"
        >Choose template</router-link
      >
      <button v-else v-on:click="checkToolsAreValid" class="button">
        Check settings
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { State, Action, Mutation } from "vuex-class";
import { IMetadataFile, IPath, ITool } from "../../ITool";

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

<style scoped></style>
