<template>
  <div id="install">
    <div class="centerize">
      <div class="field">
        <label>Git version: {{ gitVersion }}</label>
      </div>

      <selectEspIdf></selectEspIdf>

      <div class="field" v-if="espIdfErrorStatus">
        <div class="icon">
          <i class="codicon codicon-close"></i>
        </div>
        <label>{{ espIdfErrorStatus }}</label>
      </div>

      <selectPyVersion></selectPyVersion>

      <div class="field install-btn">
        <div class="control">
          <button @click.once="installEspIdf" class="button">Install</button>
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
import { IEspIdfLink } from "./types";

@Component({
  components: {
    selectEspIdf,
    selectPyVersion,
  },
})
export default class Install extends Vue {
  @Action installEspIdf;
  @Action customInstallEspIdf;
  @State("gitVersion") private storeGitVersion: string;
  @State("espIdfErrorStatus") private storeErrorStatus: string;

  get gitVersion() {
    return this.storeGitVersion;
  }

  get espIdfErrorStatus() {
    return this.storeErrorStatus;
  }
}
</script>
