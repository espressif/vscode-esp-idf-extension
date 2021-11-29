<template>
  <div id="app">
    <div class="centerize">
      <logo />
      <h1 class="title is-spaced">Welcome to ESP-IDF extension</h1>
    </div>
    <div class="is-flex is-flex-direction-row">
      <div class="box">
        <iconify-icon icon="comment" />
        ESP32 Forum
      </div>
      <div class="box">
        <iconify-icon icon="github" />
        Repository
      </div>
      <div class="box">
        <iconify-icon icon="github" />
        ESP-IDF
      </div>
      <div class="box">
        <iconify-icon icon="github" />
        Open an issue
      </div>
    </div>

    <div class="level">
      <div class="level-left notification">
        <div class="tile is-ancestor is-vertical">
          <div class="tile is-4">
            <div class="field">
              <div class="control">
                <button @click="installEspIdf" class="button">
                  Configure extension
                </button>
              </div>
            </div>
          </div>
          <div class="tile is-4">
            <div class="field">
              <div class="control">
                <button @click="installEspIdf" class="button">
                  New project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tile-ancestor notification">
        <div class="tile">
          <h1 class="title">Tutorials</h1>
        </div>
        <div class="tile level">
          <div class="level-item">
            Install and configure
          </div>
          <div class="level-item">
            Basic use
          </div>
          <div class="level-item">
            Debugging
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import Logo from "./components/logo.vue";

@Component({
  components: {
    Logo,
  },
})
export default class App extends Vue {
  @Action requestInitValues: Function;
  @State("extensionVersion") storeExtensionVersion: string;

  get extensionVersion() {
    return this.storeExtensionVersion;
  }

  mounted() {
    this.requestInitValues();
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

#app {
  padding: 1em;
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  height: -webkit-fill-available;
}

.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
