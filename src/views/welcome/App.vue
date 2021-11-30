<template>
  <div id="app">
    <div class="centerize">
      <logo class="m-1" />
      <h1 class="title is-spaced mbottom">Welcome to ESP-IDF extension</h1>
    </div>
    <div class="level">
      <div class="level-left">
        <div class="level-item">Version: {{ extensionVersion }}</div>
        <div class="level-item">
          <label class="checkbox is-small">
            <input type="checkbox" v-model="encrypt" />
            Show on extension start?
          </label>
        </div>
      </div>
      <div class="level-right mright">
        <div class="level-item link">
          <iconify-icon icon="comment" />
          ESP32 Forum
        </div>
        <div class="level-item link">
          <iconify-icon icon="github" />
          Repository
        </div>
        <div class="level-item link">
          <iconify-icon icon="github" />
          ESP-IDF
        </div>
        <div class="level-item link">
          <iconify-icon icon="github" />
          Open an issue
        </div>
      </div>
    </div>

    <div class="columns column-spacing">
      <div class="column level notification is-one-third">
        <div class="level level-right">
          <h1 class="title">Quick actions</h1>
        </div>
        <div class="level level-right">
          <div class="field">
            <div class="control">
              <button @click="openSetupPanel" class="button">
                <iconify-icon icon="gear" />
                Configure extension
              </button>
            </div>
          </div>
        </div>
        <div class="level level-right">
          <div class="field">
            <div class="control">
              <button @click="openNewProjectPanel" class="button">
                <iconify-icon icon="new-folder" />
                New project
              </button>
            </div>
          </div>
        </div>
        <div class="level level-right">
          <div class="field">
            <div class="control">
              <button @click="openImportProject" class="button">
                <iconify-icon icon="folder-opened" />
                Import project
              </button>
            </div>
          </div>
        </div>
        <div class="level level-right">
          <div class="field">
            <div class="control">
              <button @click="openShowExamplesPanel" class="button">
                <iconify-icon icon="beaker" />
                Show examples
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="column notification is-two-fifths">
        <div class="level level-right">
          <h1 class="title">Getting Started</h1>
        </div>
        <div class="m-1">
          <h1 class="subtitle mbottom has-text-weight-bold">Tutorials</h1>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            <a href="command:espIdf.buildDevice">Install and configure</a>
          </div>
          <div class="level-item mx-1 link">
            Basic use
          </div>
          <div class="level-item mx-1 link">
            Debugging
          </div>
        </div>

        <div class="m-1">
          <h1 class="subtitle mbottom has-text-weight-bold">Documentation</h1>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            Settings
          </div>
          <div class="level-item mx-1 link">
            Features
          </div>
          <div class="level-item mx-1 link">
            Contribute
          </div>
          <div class="level-item mx-1 link">
            Other...
          </div>
        </div>

        <div class="m-1">
          <h1 class="subtitle mbottom has-text-weight-bold">Browse</h1>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            ESP-IDF Components
          </div>
          <div class="level-item mx-1 link">
            ESP Rainmaker
          </div>
          <div class="level-item mx-1 link">
            ESP-ADF
          </div>
          <div class="level-item mx-1 link">
            ESP-MDF
          </div>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            Arduino ESP32
          </div>
          <div class="level-item mx-1 link">
            ESP-IOT Solution
          </div>
          <div class="level-item mx-1 link">
            ESP-NOW
          </div>
          <div class="level-item mx-1 link">
            ESP-Jumpstart
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import Logo from "./components/logo.vue";

@Component({
  components: {
    Logo,
  },
})
export default class App extends Vue {
  @Action requestInitValues: Function;
  @Action openImportProject: Function;
  @Action openNewProjectPanel: Function;
  @Action openSetupPanel: Function;
  @Action openShowExamplesPanel: Function;
  @Mutation setShowOnInit: Function;
  @State("extensionVersion") storeExtensionVersion: string;
  @State("showOnInit") storeShowOnInit: boolean;

  get extensionVersion() {
    return this.storeExtensionVersion;
  }

  get showOnInit() {
    return this.storeShowOnInit;
  }
  set showOnInit(newVal: boolean) {
    this.setShowOnInit(newVal);
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

.column-spacing {
  justify-content: space-between;
  margin: 1em;
}

.mbottom {
  margin-bottom: 0.5em;
}

.mright {
  margin-right: 1.5em;
}

.link {
  &:hover {
    color: var(--vscode-button-background);
  }
  cursor: pointer;
}
</style>
