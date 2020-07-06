<template>
  <div id="tools-manual-setup">
    <i class="arrow go-back right" v-on:click="reset"></i>
    <h4 class="subtitle">Verify ESP-IDF Tools</h4>
    <ToolsManual v-if="!isToolsCheckCompleted" />

    <div id="tools-check-results field" v-if="showIdfToolsChecks">
      <ToolCheck
        :tool="toolCheck"
        v-for="toolCheck in toolsCheckResults"
        :key="toolCheck.id"
      />
      <h4 class="subtitle">Verify Python packages requirements</h4>
      <p id="python-log" class="notification">{{ pyLog }}</p>
    </div>
    <br />
    <div class="field centerize">
      <div class="control">
        <button
          v-on:click="selectToolsSetup('complete')"
          class="button"
          v-if="isToolsCheckCompleted && isPyInstallCompleted"
        >
          Go to next step.
        </button>
        <button v-on:click="checkIdfToolsExists" class="button" v-else>
          Click here to check tools exists.
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import ToolCheck from "./ToolCheck.vue";
import ToolsManual from "./ToolsManual.vue";

@Component({
  components: {
    ToolCheck,
    ToolsManual,
  },
})
export default class ToolsSkipStep extends Vue {
  @Action("checkManualExportPaths") private checkIdfToolsExists;
  @Mutation private setToolCheckFinish;
  @Mutation private setShowIdfToolsChecks;
  @Mutation private setPySetupFinish;
  @Prop() private isPyInstallCompleted;
  @Prop() private selectToolsSetup;
  @State("isToolsCheckCompleted") private storeIsToolsCheckCompleted;
  @State("pyLog") private storePyLog: string;
  @State("showIdfToolsChecks") private storeShowIdfToolsChecks;
  @State("toolsCheckResults") private storeToolsCheckResults;

  get isToolsCheckCompleted() {
    return this.storeIsToolsCheckCompleted;
  }
  get pyLog() {
    return this.storePyLog;
  }
  get showIdfToolsChecks() {
    return this.storeShowIdfToolsChecks;
  }
  get toolsCheckResults() {
    return this.storeToolsCheckResults;
  }

  public reset() {
    this.selectToolsSetup("empty");
    this.setToolCheckFinish(false);
    this.setShowIdfToolsChecks(false);
    this.setPySetupFinish(false);
  }
}
</script>

<style>
#python-log {
  white-space: pre-line;
}
#tools-manual-setup {
  margin: auto;
  width: 80%;
}
</style>
