<template>
  <div id="custom-setup">
    <div class="centerize">
      <div class="field centerize" v-if="!isInstalling">
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

      <div class="centerize" v-if="selectedIdfTools === 'toolsDownload'">
        <folderOpen
          propLabel="Enter ESP-IDF Tools directory"
          :propModel.sync="toolsFolder"
          :openMethod="openEspIdfToolsFolder"
          v-if="!isInstalling"
        />
        <div class="field centerize install-btn" v-if="!isInstalling">
          <div class="control">
            <button class="button" @click.once="installIdfTools">
              Download Tools
            </button>
          </div>
        </div>
        <div class="centerize">
          <toolDownload
            v-for="tool in toolsResults"
            :key="tool.id"
            :tool="tool"
          />
        </div>
      </div>

      <div class="centerize" v-if="selectedIdfTools === 'toolsExisting'">
        <div class="field centerize install-btn">
          <div class="control">
            <button
              class="button"
              @click="checkEspIdfTools"
              v-if="allToolsAreValid"
            >
              Save Settings
            </button>
            <button class="button" @click="checkEspIdfTools" v-else>
              Check Tools
            </button>
          </div>
        </div>
        <toolManual v-for="tool in toolsResults" :key="tool.id" :tool="tool" />
      </div>
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
import { IEspIdfTool } from "./types";

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
  @Mutation setIsIdfInstalling;
  @Mutation setToolsFolder;
  @State("isIdfInstalling") private storeIsInstalling: boolean;
  @State("toolsFolder") private storeToolsFolder: string;
  @State("toolsResults") private storeToolsResults: IEspIdfTool[];

  get isInstalling() {
    return this.storeIsInstalling;
  }

  get allToolsAreValid() {
    const invalidTools = this.storeToolsResults.filter((tool) => {
      return !tool.doesToolExist;
    });
    console.log(invalidTools);
    return invalidTools.length === 0;
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

  installIdfTools() {
    this.setIsIdfInstalling(true);
    this.installEspIdfTools();
  }
}
</script>
