<template>
  <div>
    <div class="field centerize">
      <label for="idf-version-select">Select ESP-IDF version:</label>
      <div class="control">
        <select v-model="selectedIdfVersion" class="select">
          <option v-for="ver in idfVersionList" :key="ver.name" :value="ver">{{
            ver.name
          }}</option>
        </select>
      </div>
    </div>
    <div
      class="field centerize text-size"
      v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
    >
      <label>Enter ESP-IDF directory</label>
      <div class="field is-grouped text-size">
        <div class="control is-expanded">
          <input type="text" class="input" v-model="espIdf" />
        </div>
        <div class="control">
          <font-awesome-icon
            :icon="folderIcon"
            class="open-icon"
            @mouseover="folderIcon = 'folder-open'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openEspIdfFolder"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { IEspIdfLink } from "../../types";
import { State, Action, Mutation } from "vuex-class";

@Component
export default class SelectEspIdf extends Vue {
  private folderIcon = "folder";
  @Action private openEspIdfFolder;
  @Mutation setEspIdfPath;
  @Mutation setSelectedEspIdfVersion;
  @State("espIdfVersionList") private storeEspIdfVersionList: IEspIdfLink[];
  @State("selectedEspIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("espIdf") private storeEspIdf: string;

  get idfVersionList() {
    return this.storeEspIdfVersionList;
  }

  get selectedIdfVersion() {
    return this.storeSelectedIdfVersion;
  }
  set selectedIdfVersion(newValue: IEspIdfLink) {
    this.setSelectedEspIdfVersion(newValue);
  }

  get espIdf() {
    return this.storeEspIdf;
  }
  set espIdf(newValue: string) {
    this.setEspIdfPath(newValue);
  }
}
</script>
