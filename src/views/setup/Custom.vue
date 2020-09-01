<template>
  <div id="custom-setup">
    <div class="centerize" v-if="!isInstalled">
      <div class="field centerize">
        <label for="idf-version-select">ESP-IDF Tools</label>
        <div class="control">
          <div class="select">
            <select v-model="selectedIdfTools">
              <option value="toolsDownload">Download ESP-IDF Tools</option>
              <option value="toolsExisting">Use existing ESP-IDF Tools</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field centerize install-btn">
        <div class="control">
          <button
            class="button"
            @click.once="installEspIdfTools"
            v-if="selectedIdfTools === 'toolsDownload'"
          >
            Download Tools
          </button>
          <button class="button" @click="checkEspIdfTools" v-else>
            Check Tools
          </button>
        </div>
      </div>

      <div class="centerize" v-if="selectedIdfTools === 'toolsDownload'">
        <folderOpen
          propLabel="Enter ESP-IDF Tools directory"
          :propModel.sync="toolsFolder"
          :openMethod="openEspIdfToolsFolder"
        />
        <div class="centerize">
          <toolDownload
            v-for="tool in toolsResults"
            :key="tool.id"
            :tool="tool"
          />
        </div>
      </div>

      <div class="centerize" v-if="selectedIdfTools === 'toolsExisting'">
        <toolManual v-for="tool in toolsResults" :key="tool.id" :tool="tool" />
      </div>
    </div>
    <div v-if="isInstalled">
      <h2 class="subtitle">
        ESP-IDF have been configured for this extension of Visual Studio Code.
      </h2>
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
  @Action checkEspIdfTools;
  @Action installEspIdfTools;
  @Action openEspIdfToolsFolder;
  @Mutation setToolsFolder;
  @State("isIdfInstalled") private storeIsInstalled: boolean;
  @State("toolsFolder") private storeToolsFolder: string;
  @State("toolsResults") private storeToolsResults: IEspIdfLink[];

  get isInstalled() {
    return this.storeIsInstalled;
  }

  get toolsFolder() {
    return this.storeToolsFolder;
  }
  set toolsFolder(newValue: string) {
    this.setToolsFolder(newValue);
  }

  get toolsResults() {
    return this.storeToolsResults;
  }
}
</script>
