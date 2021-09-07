<template>
  <div id="select-esp-idf-version">
    <div class="field">
      <label for="idf-mirror-select" class="label"
        >Select download server:</label
      >
      <div class="control">
        <div class="select">
          <select v-model="selectedIdfMirror" @change="clearIDfErrorStatus">
            <option :value="idfMirror.Espressif">Espressif</option>
            <option :value="idfMirror.Github">Github</option>
          </select>
        </div>
      </div>
    </div>
    <div class="field">
      <label for="idf-version-select" class="label"
        >Select ESP-IDF version:</label
      >
      <div class="control">
        <div class="select">
          <select v-model="selectedIdfVersion" @change="clearIDfErrorStatus">
            <option
              v-for="ver in idfVersionList"
              :key="ver.name"
              :value="ver"
              >{{ ver.name }}</option
            >
          </select>
        </div>
      </div>
    </div>
    <folderOpen
      propLabel="Enter ESP-IDF directory (IDF_PATH)"
      :propModel.sync="espIdf"
      :propMutate="setEspIdfPath"
      :openMethod="openEspIdfFolder"
      :onChangeMethod="clearIDfErrorStatus"
      v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
    />
    <folderOpen
      propLabel="Enter ESP-IDF container directory"
      :propModel.sync="espIdfContainer"
      :propMutate="setEspIdfContainerPath"
      :openMethod="openEspIdfContainerFolder"
      :onChangeMethod="clearIDfErrorStatus"
      staticText="esp-idf"
      v-if="selectedIdfVersion && selectedIdfVersion.filename !== 'manual'"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { IdfMirror, IEspIdfLink } from "../types";
import { State, Action, Mutation } from "vuex-class";
import folderOpen from "./folderOpen.vue";

@Component({
  components: {
    folderOpen,
  },
})
export default class SelectEspIdf extends Vue {
  @Action private openEspIdfFolder;
  @Action private openEspIdfContainerFolder;
  @Mutation setEspIdfPath;
  @Mutation setEspIdfContainerPath;
  @Mutation setIdfMirror;
  @Mutation setSelectedEspIdfVersion;
  @Mutation setEspIdfErrorStatus;
  @State("espIdf") private storeEspIdf: string;
  @State("espIdfContainer") private storeEspIdfContainer: string;
  @State("espIdfVersionList") private storeEspIdfVersionList: IEspIdfLink[];
  @State("selectedEspIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("selectedIdfMirror") private storeSelectedIdfMirror;

  get espIdf() {
    return this.storeEspIdf;
  }

  get espIdfContainer() {
    return this.storeEspIdfContainer;
  }

  get idfMirror() {
    return IdfMirror;
  }

  get idfVersionList() {
    return this.storeEspIdfVersionList;
  }

  get selectedIdfVersion() {
    return this.storeSelectedIdfVersion;
  }
  set selectedIdfVersion(newValue: IEspIdfLink) {
    this.setSelectedEspIdfVersion(newValue);
  }

  get selectedIdfMirror() {
    return this.storeSelectedIdfMirror;
  }
  set selectedIdfMirror(val: IdfMirror) {
    this.setIdfMirror(val);
  }

  public clearIDfErrorStatus() {
    this.setEspIdfErrorStatus("");
  }
}
</script>

<style scoped>
#select-esp-idf-version {
  margin: 0.25em;
}
</style>
