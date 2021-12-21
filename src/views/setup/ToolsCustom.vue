<template>
  <div id="custom-setup">
    <div class="notification">
      <div class="field">
        <label for="idf-version-select" class="label">ESP-IDF Tools</label>
        <div class="control">
          <div class="select">
            <select v-model="selectedIdfTools" data-config-id="select-esp-idf-tools">
              <option value="toolsDownload">Download ESP-IDF Tools</option>
              <option value="toolsExisting">Use existing ESP-IDF Tools</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="selectedIdfTools === 'toolsDownload'">
        <ul>
          <li v-for="tool in toolsResults" :key="tool.id" class="label">
            <strong class="span-path">{{ tool.id }}</strong>
            <em>{{ tool.expected }}</em>
          </li>
        </ul>
        <div class="field install-btn">
          <div class="control">
            <button class="button" @click.once="installIdfTools">
              Download Tools
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedIdfTools === 'toolsExisting'">
        <toolManual v-for="tool in toolsResults" :key="tool.id" :tool="tool" />
        <div class="field install-btn">
          <div class="control">
            <button
              class="button"
              @click="saveCustomSettings"
              v-if="allToolsAreValid"
            >
              Save Settings
            </button>
            <button class="button" @click="checkEspIdfTools" v-else>
              Check Tools
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import selectEspIdf from "./components/selectEspIdf.vue";
import selectPyVersion from "./components/selectPyVersion.vue";
import toolManual from "./components/toolManual.vue";
import { IEspIdfTool } from "./types";

@Component({
  components: {
    selectEspIdf,
    selectPyVersion,
    toolManual,
  },
})
export default class CustomSetup extends Vue {
  private selectedIdfTools = "toolsDownload";
  @Action checkEspIdfTools;
  @Action installEspIdfTools;
  @Action saveCustomSettings;
  @Mutation setIsIdfInstalling;
  @Mutation setToolsResult;
  @State("toolsResults") private storeToolsResults: IEspIdfTool[];

  get allToolsAreValid() {
    const invalidTools = this.storeToolsResults.filter((tool) => {
      return !tool.doesToolExist;
    });
    return invalidTools.length === 0;
  }

  get toolsResults() {
    return this.storeToolsResults;
  }

  installIdfTools() {
    this.setIsIdfInstalling(true);
    this.installEspIdfTools();
  }

  mounted() {
    const updatedToolsInfo = this.storeToolsResults.map((tool) => {
      if (tool.doesToolExist) {
        tool.progress = "100.00%";
        tool.hashResult = true;
      } else {
        tool.progress = "0.00%";
        tool.hashResult = false;
      }
      return tool;
    });
    this.setToolsResult(updatedToolsInfo);
  }
}
</script>

<style scoped>
#custom-setup {
  margin: 1% 5%;
}
</style>
