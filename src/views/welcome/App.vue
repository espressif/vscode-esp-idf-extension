<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
import { useWelcomeStore } from "./store";
import Logo from "./components/logo.vue";
import {
  IconBeaker,
  IconComment,
  IconFolderOpened,
  IconGear,
  IconGithub,
  IconNewFolder,
  IconTypeHierarchy,
} from "@iconify-prerendered/vue-codicon";

const store = useWelcomeStore();

const { espIdf, extensionVersion, showOnInit } = storeToRefs(store);

const whatsNewLink = computed(() => {
  return `https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v${extensionVersion.value}`;
});

onMounted(() => {
  store.requestInitValues();
});
</script>

<template>
  <div id="app">
    <div class="centerize">
      <Logo class="m-1" />
      <h1 class="title is-spaced mbottom">
        Welcome to Espressif IDF extension
      </h1>
    </div>
    <div class="level">
      <div class="level-left columns">
        <div class="column mleft">
          Version: {{ extensionVersion }}
          <br />
          <div class="link">
            <a :href="whatsNewLink">See what's new</a>
          </div>
          <label class="checkbox is-small">
            <input
              type="checkbox"
              v-model="store.showOnInit"
              @change="store.updateShowOnboardingOnInit"
            />
            Show Welcome on extension startup
          </label>
        </div>
      </div>
      <div class="level-right mright">
        <div class="level-item link">
          <a href="https://github.com/espressif/idf-im-ui/releases">
            <IconGithub class="icon-margin" />
            ESP-IDF Installation Manager
          </a>
          <a href="https://github.com/espressif/vscode-esp-idf-extension">
            <IconGithub class="icon-margin" />
            Repository
          </a>
        </div>
        <div class="level-item link">
          <a href="https://esp32.com/viewforum.php?f=40">
            <IconComment class="icon-margin" />
            ESP32 Forum
          </a>
        </div>
        <div class="level-item link">
          <a href="https://github.com/espressif/esp-idf">
            <IconGithub class="icon-margin" />
            ESP-IDF
          </a>
        </div>
        <div class="level-item link">
          <a
            href="https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose"
          >
            <IconGithub class="icon-margin" />
            Open a new issue
          </a>
        </div>
      </div>
    </div>

    <div class="columns column-spacing">
      <div class="column level is-one-third">
        <div class="level level-left">
          <h1 class="title">Quick actions</h1>
        </div>
        <div class="level level-left">
          <div class="field">
            <div class="control">
              <button @click="store.openSetupPanel" class="button">
                <IconGear class="icon-margin" />
                Configure extension
              </button>
            </div>
          </div>
        </div>
        <div class="level level-left">
          <div class="field">
            <div class="control">
              <button @click="store.openNewProjectPanel" class="button">
                <IconNewFolder class="icon-margin" />
                New project
              </button>
            </div>
          </div>
        </div>
        <div class="level level-left">
          <div class="field">
            <div class="control">
              <button @click="store.openImportProject" class="button">
                <IconFolderOpened class="icon-margin" />
                Import project
              </button>
            </div>
          </div>
        </div>
        <div class="level level-left">
          <div class="field">
            <div class="control">
              <button @click="store.openShowExamplesPanel" class="button">
                <IconBeaker class="icon-margin" />
                Show examples
              </button>
            </div>
          </div>
        </div>
        <div class="level level-left">
          <div class="field">
            <div class="control">
              <button @click="store.exploreComponents" class="button">
                <IconTypeHierarchy class="icon-margin" />
                Components manager
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="column is-two-fifths">
        <div class="level level-right">
          <h1 class="title">Getting Started</h1>
        </div>
        <div class="m-1">
          <h1 class="subtitle mbottom has-text-weight-bold">Tutorials</h1>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/installation.html"
              >Install and configure</a
            >
          </div>
          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/startproject.html"
            >
              Start a ESP-IDF project
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/debugproject.html"
            >
              Debugging
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/index.html"
            >
              Others...
            </a>
          </div>
        </div>

        <div class="m-1">
          <h1 class="subtitle mbottom has-text-weight-bold">Documentation</h1>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/settings.html"
            >
              Settings
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/index.html"
            >
              Features
            </a>
          </div>

          <div class="level-item mx-1 link">
            <a
              href="https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/CONTRIBUTING.md"
            >
              Contribute
            </a>
          </div>

          <div class="level-item mx-1 link">
            <a
              href="https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures.html"
            >
              Additional features...
            </a>
          </div>
        </div>

        <div class="m-1">
          <h1 class="subtitle mbottom has-text-weight-bold">Browse</h1>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/esp-who">
              ESP-WHO
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a href="https://rainmaker.espressif.com">
              ESP Rainmaker
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/esp-adf">
              ESP-ADF
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/esp-mdf">
              ESP-MDF
            </a>
          </div>
        </div>
        <div class="level m-4">
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/arduino-esp32">
              Arduino ESP32
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/esp-iot-solution">
              ESP-IOT Solution
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/esp-now">
              ESP-NOW
            </a>
          </div>
          <div class="level-item mx-1 link">
            <a href="https://github.com/espressif/esp-jumpstart">
              ESP-Jumpstart
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

.column {
  background-color: var(--vscode-notifications-background);
}

.icon-margin {
  margin-right: 0.25em;
}

.column-spacing {
  justify-content: space-between;
  margin: 1em;
}

.mbottom {
  margin-bottom: 0.5em;
}

.mleft {
  margin-left: 1.5em;
}

.mright {
  margin-right: 1.5em;
}

.checkbox:hover {
  color: var(--vscode-button-background);
}

.link {
  &:hover {
    color: var(--vscode-button-background);
  }
  cursor: pointer;
  a {
    color: var(--vscode-editorInfo-foreground);
    display: flex;
    align-items: center;
    text-decoration: none;
    &:hover {
      color: var(--vscode-button-background);
    }
  }
}
</style>
