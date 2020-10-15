<template>
  <div id="install">
    <div class="notification">
      <div class="field">
        <label>Git version: {{ gitVersion }}</label>
      </div>

      <selectEspIdf></selectEspIdf>

      <div class="notification is-danger" v-if="espIdfErrorStatus">
        <p>{{ espIdfErrorStatus }}</p>
      </div>

      <selectPyVersion></selectPyVersion>

      <div class="notification is-danger" v-if="pyExecErrorStatus">
        <p>{{ pyExecErrorStatus }}</p>
      </div>

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
  @State("pyExecErrorStatus") private storePyExecErrorStatus: string;

  get gitVersion() {
    return this.storeGitVersion;
  }

  get espIdfErrorStatus() {
    return this.storeErrorStatus;
  }

  get pyExecErrorStatus() {
    return this.storePyExecErrorStatus;
  }
}
</script>

<style scoped>
#install {
  margin: 1% 5%;
}
</style>
