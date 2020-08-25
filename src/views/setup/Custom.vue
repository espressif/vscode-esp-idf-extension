<template>
  <div id="custom-setup">
    <div class="centerize" v-if="!isInstalled">
      <div class="field centerize">
        <label for="idf-version-select"
          >Download ESP-IDF Tools or set them manually</label
        >
        <div class="control">
          <div class="select">
            <select v-model="selectedIdfTools">
              <option value="toolsDownload">Download ESP-IDF Tools</option>
              <option value="toolsExisting">Use existing ESP-IDF Tools</option>
            </select>
          </div>
        </div>
      </div>

      <div class="centerize" v-if="selectedIdfTools === 'toolsDownload'">
        <folderOpen
          propLabel="Enter ESP-IDF Tools directory"
          :propModel.sync="toolsFolder"
          :openMethod="openEspIdfToolsFolder"
        />
        <toolDownload
          v-for="tool in toolsResults"
          :key="tool.id"
          :tool="tool"
        />
      </div>

      <div class="centerize" v-if="selectedIdfTools === 'toolsExisting'">
        <toolManual v-for="tool in toolsResults" :key="tool.id" :tool="tool" />
      </div>

      <div class="field centerize">
        <label for="idf-version-select"
          >Create or use existing python virtual environment:</label
        >
        <div class="control">
          <div class="select">
            <select v-model="selectedPyEnv">
              <option value="pyenvCreate"
                >Create python virtual environment</option
              >
              <option value="pyenvUse"
                >Use existing python virtual environment</option
              >
            </select>
          </div>
        </div>
      </div>

      <folderOpen
        propLabel="Enter Python virtual environment directory"
        :propModel.sync="manualVEnvPython"
        :openMethod="openPyVenvPath"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import selectEspIdf from "./components/home/selectEspIdf.vue";
import selectPyVersion from "./components/home/selectPyVersion.vue";
import folderOpen from "./components/common/folderOpen.vue";
import toolDownload from "./components/custom/toolDownload.vue";
import toolManual from "./components/custom/toolManual.vue";
import { IEspIdfLink } from "./types";

@Component({
  components: {
    folderOpen,
    selectEspIdf,
    selectPyVersion,
    toolDownload,
    toolManual,
  },
})
export default class CustomSetup extends Vue {
  private useExistingPyEnv: boolean = false;
  private selectedIdfTools = "toolsDownload";
  private selectedPyEnv = "pyEnvCreate";
  @Action openEspIdfToolsFolder;
  @Action openPyVenvPath;
  @Mutation setToolsFolder;
  @Mutation setManualVenvPyPath;
  @State("manualVEnvPython") private storeManualVEnvPython: string;
  @State("toolsFolder") private storeToolsFolder: string;
  @State("toolsResults") private storeToolsResults: IEspIdfLink[];

  get toolsFolder() {
    return this.storeToolsFolder;
  }
  set toolsFolder(newValue: string) {
    this.setToolsFolder(newValue);
  }

  get manualVEnvPython() {
    return this.storeManualVEnvPython;
  }
  set manualVEnvPython(newValue: string) {
    this.setManualVenvPyPath(newValue);
  }

  get toolsResults() {
    return this.storeToolsResults;
  }
}
</script>
