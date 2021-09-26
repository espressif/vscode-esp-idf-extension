<template>
  <div id="home">
    <div class="centerize" v-if="!hasPrerequisites">
      <h1 class="title is-spaced">Welcome.</h1>
        <p v-if="platform !== 'win32'">
          First, install the
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/macos-setup.html"
            v-if="platform === 'darwin'"
            >ESP-IDF Prerequisites for MacOS</a
          >
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html"
            v-if="platform === 'linux'"
            >ESP-IDF Prerequisites for Linux</a
          >,
        </p>
        <p>restart Visual Studio Code and run this wizard again.</p>
    </div>
    <div class="centerize notification" v-if="hasPrerequisites">
      <div class="control centerize home-title">
        <h1 class="title is-spaced">Welcome.</h1>
        <p v-if="platform !== 'win32'">
          First, install the
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/macos-setup.html"
            v-if="platform === 'darwin'"
            >ESP-IDF Prerequisites for MacOS</a
          >
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html"
            v-if="platform === 'linux'"
            >ESP-IDF Prerequisites for Linux</a
          >,
        </p>
        <p>restart Visual Studio Code and run this wizard again.</p>
        <h2 class="subtitle">Choose a setup mode.</h2>
      </div>
      <div
        class="notification install-choice"
        @click="goTo('/autoinstall', setupMode.express)"
      >
        <label for="express" class="subtitle">EXPRESS</label>
        <p name="express">
          Fastest option. Choose ESP-IDF version and python version to create
          ESP-IDF python virtual environment. ESP-IDF Tools will be installed in
          <span class="span-path">{{ toolsFolder }}</span
          >.
        </p>
      </div>
      <div
        class="notification install-choice"
        @click="goTo('/autoinstall', setupMode.advanced)"
      >
        <label for="advanced" class="subtitle">ADVANCED</label>
        <p name="advanced">
          Configurable option. Choose ESP-IDF version and python version to
          create ESP-IDF python virtual environment. Choose ESP-IDF Tools
          install directory or manually input each existing ESP-IDF tool path.
        </p>
      </div>
      <div
        class="notification install-choice"
        @click.once="useDefaultSettings"
        v-if="isPreviousSetupValid"
      >
        <label for="existing" class="subtitle"> USE EXISTING SETUP</label>
        <p>
          We have found ESP-IDF version: {{ idfVersion }} @<span
            class="span-path"
            >{{ espIdf }}</span
          >
          and ESP-IDF tools in @<span class="span-path"> {{ toolsFolder }}</span
          >. Click here to use them.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IEspIdfTool, SetupMode } from "./types";
import { router } from "./main";

@Component
export default class Home extends Vue {
  @Action requestInitialValues;
  @Action useDefaultSettings;
  @Mutation setSetupMode;
  @State("hasPrerequisites") private storeHasPrerequisites: boolean;
  @State("idfVersion") private storeIdfVersion: string;
  @State("manualPythonPath") storeManualSysPython: string;
  @State("toolsResults") private storeToolsResults: IEspIdfTool[];
  @State("toolsFolder") private storeToolsFolder: string;
  @State("espIdf") private storeEspIdf: string;
  @State("platform") private storePlatform: string;

  get espIdf() {
    return this.storeEspIdf;
  }

  get hasPrerequisites() {
    return this.storeHasPrerequisites;
  }

  get idfVersion() {
    return this.storeIdfVersion;
  }

  get platform() {
    return this.storePlatform;
  }

  get isPreviousSetupValid() {
    if (this.storeToolsResults.length === 0) {
      return false;
    }
    const failedToolsResult = this.storeToolsResults.filter(
      (tInfo) => !tInfo.doesToolExist
    );
    if (
      this.storeManualSysPython &&
      this.storeToolsResults.length > 0 &&
      failedToolsResult.length === 0
    ) {
      return true;
    }
    return false;
  }

  get setupMode() {
    return SetupMode;
  }

  get toolsFolder() {
    return this.storeToolsFolder;
  }

  mounted() {
    this.requestInitialValues();
  }

  goTo(route: string, setupMode: SetupMode) {
    router.push(route);
    this.setSetupMode(setupMode);
  }
}
</script>

<style lang="scss">
#home {
  margin: 1% 5%;
}
.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.expanded {
  width: 80%;
}

.home-title {
  margin: 1%;
}

.install-btn {
  margin: 0.5em;
  display: flex;
  justify-content: flex-end;
}

.install-choice {
  text-align: start;
  width: 100%;
  border: 1px solid;
  border-radius: 4px;
}

.install-choice:hover {
  background-color: var(--vscode-textBlockQuote-background);
  border-color: var(--vscode-button-hoverBackground);
  cursor: pointer;
  .span-path {
    font-weight: bolder;
  }
  .subtitle {
    color: var(--vscode-button-hoverBackground);
  }
  p {
    color: var(--vscode-button-hoverBackground);
  }
}

.notification {
  .subtitle {
    font-weight: bold;
  }
  a {
    text-decoration: none;
  }
}

#home a:hover {
  color: var(--vscode-textLink-activeForeground);
  font-weight: bolder;
}

div.notification.is-danger {
  background-color: var(--vscode-editorGutter-deletedBackground);
}
</style>
