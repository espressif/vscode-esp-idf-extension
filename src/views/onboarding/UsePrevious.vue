<template>
  <div id="previous-window">
    <router-link
      to="/"
      class="arrow go-back right"
      @click.native="reset"
    ></router-link>
    <h4>Use previous configuration settings</h4>
    <div v-if="previousIsValid">
      <p>All tools are correct.</p>
      <button v-on:click="saveSettings" class="onboarding-button">
        Save settings
      </button>
    </div>
    <div v-else>
      <label for="idf-version-select">Select ESP-IDF version:</label>
      <br />
      <br />
      <select
        v-model="selectedIdfMetadata"
        id="idf-version-select"
        @change="changeSelectedIdfPath"
      >
        <option v-for="ver in idfVersionsMetadata" :key="ver.id" :value="ver">
          {{ ver.path }}
        </option>
      </select>
      <p>Selected ESP-IDF Path version: {{ previousIdfVersion }}</p>
      <div v-if="venvVersionsMetadata && venvVersionsMetadata.length > 0">
        <label for="python-version-select">Python version:</label>
        <br /><br />
        <select
          v-model="selectedVenvMetadata"
          @change="setPreviousIsValid(false)"
        >
          <option
            v-for="env in venvVersionsMetadata"
            :key="env.id"
            :value="env"
          >
            {{ env.path }}
          </option>
        </select>
        <br /><br />
        <div v-if="toolsInMetadata && toolsInMetadata.length > 0">
          <PreviousTool
            v-for="tool in toolsInMetadata"
            :key="tool.id"
            :tool="tool"
          />
          <button v-on:click="checkAreValid" class="onboarding-button">
            Check tools are valid
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IPath, ITool } from "../../ITool";
import PreviousTool from "./components/PreviousTool.vue";

@Component({
  components: {
    PreviousTool,
  },
})
export default class UsePrevious extends Vue {
  @State("idfVersionsMetadata") private storeIdfVersionsMetadata: IPath[];
  @State("selectedIdfMetadata") private storeSelectedIdfMetadata: IPath;
  @State("venvVersionsMetadata") private storeVenvVersionsMetadata: IPath[];
  @State("selectedVenvMetadata") private storeSelectedVenvMetadata: IPath;
  @State("toolsInMetadata") private storeToolsInMetadata: ITool[];
  @State("previousIdfVersion") private storePreviousIdfVersion: string;
  @State("previousIsValid") private storePreviousIsValid: boolean;
  @Action("checkPreviousAreValid") private checkAreValid;
  @Action("getPyVenvIdfToolsForVersion") private getPyVenvIdfTools;
  @Action("savePreviousSettings") private saveSettings;
  @Mutation private setPreviousIsValid;
  @Mutation private setSelectedEspIdfVersionMetadata;
  @Mutation private setSelectedVenvVersionMetadata;
  @Mutation private setPySetupFinish;

  get idfVersionsMetadata() {
    return this.storeIdfVersionsMetadata;
  }

  get selectedIdfMetadata() {
    return this.storeSelectedIdfMetadata;
  }
  set selectedIdfMetadata(val) {
    this.setSelectedEspIdfVersionMetadata(val);
  }

  get venvVersionsMetadata() {
    return this.storeVenvVersionsMetadata;
  }

  get selectedVenvMetadata() {
    return this.storeSelectedVenvMetadata;
  }
  set selectedVenvMetadata(val) {
    this.setSelectedVenvVersionMetadata(val);
  }

  get toolsInMetadata() {
    return this.storeToolsInMetadata;
  }

  get previousIdfVersion() {
    return this.storePreviousIdfVersion;
  }

  get previousIsValid() {
    return this.storePreviousIsValid;
  }

  public changeSelectedIdfPath(e) {
    this.getPyVenvIdfTools();
    this.setPreviousIsValid(false);
  }

  public reset() {
    this.setPySetupFinish(false);
    this.setPreviousIsValid(false);
  }
}
</script>

<style scoped>
select {
  width: 100%;
}
</style>
