<template>
  <div id="select-esp-idf-version">
    <div class="field centerize">
      <label for="idf-version-select">Select ESP-IDF version:</label>
      <div class="control">
        <div class="select">
          <select v-model="selectedIdfVersion">
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
      propLabel="Enter ESP-IDF directory"
      :propModel.sync="espIdf"
      :propMutate="setEspIdfPath"
      :openMethod="openEspIdfFolder"
      v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
    />
    <folderOpen
      propLabel="Enter ESP-IDF container directory"
      :propModel.sync="espIdfContainer"
      :propMutate="setEspIdfContainerPath"
      :openMethod="openEspIdfContainerFolder"
      staticText="esp-idf"
      v-if="selectedIdfVersion && selectedIdfVersion.filename !== 'manual'"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { IEspIdfLink } from "../../types";
import { State, Action, Mutation } from "vuex-class";
import folderOpen from "../common/folderOpen.vue";

@Component({
  components: {
    folderOpen,
  },
})
export default class SelectEspIdf extends Vue {
  private folderIcon = "codicon codicon-folder";
  @Action private openEspIdfFolder;
  @Action private openEspIdfContainerFolder;
  @Mutation setEspIdfPath;
  @Mutation setEspIdfContainerPath;
  @Mutation setSelectedEspIdfVersion;
  @State("espIdfVersionList") private storeEspIdfVersionList: IEspIdfLink[];
  @State("selectedEspIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("espIdf") private storeEspIdf: string;
  @State("espIdfContainer") private storeEspIdfContainer: string;

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

  get espIdfContainer() {
    return this.storeEspIdfContainer;
  }
}
</script>

<style scoped>
#select-esp-idf-version {
  width: 100%;
  margin: 0.25em;
}
</style>
