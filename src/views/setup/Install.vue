<template>
  <div id="install">
    <div class="notification">
      <div class="field">
        <label>Git version: {{ gitVersion }}</label>
      </div>

      <selectEspIdf></selectEspIdf>

      <div
        class="notification is-danger error-message"
        v-if="espIdfErrorStatus"
      >
        <p>{{ espIdfErrorStatus }}</p>
        <div class="icon is-large is-size-4" @click="setEspIdfErrorStatus('')">
          <iconify-icon icon="close" />
        </div>
      </div>

      <selectPyVersion></selectPyVersion>

      <div
        class="notification is-danger error-message"
        v-if="pyExecErrorStatus"
      >
        <p>{{ pyExecErrorStatus }}</p>
        <div class="icon is-large is-size-4" @click="setPyExecErrorStatus('')">
          <iconify-icon icon="close" />
        </div>
      </div>

      <div class="field install-btn">
        <div class="control">
          <button @click="installEspIdf" class="button">Install</button>
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
  @Mutation setEspIdfErrorStatus;
  @Mutation setPyExecErrorStatus;
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

.error-message {
  padding: 0.5em;
  margin: 0.5em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message .icon:hover {
  color: var(--vscode-button-foreground);
}
</style>
