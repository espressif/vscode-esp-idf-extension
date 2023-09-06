<script setup lang="ts">
import { storeToRefs } from "pinia";
import { router } from "./main";
import { useSetupStore } from "./store";
import { computed, onMounted } from "vue";
import { SetupMode } from "../setup/types";
import selectSaveScope from "./components/selectSaveScope.vue";

const store = useSetupStore();

const { hasPrerequisites, platform } = storeToRefs(store);

const setupMode = computed(() => {
  return SetupMode;
});

onMounted(() => {
  store.requestInitialValues();
});

function goTo(route: string, setupMode: SetupMode) {
  router.push(route);
  store.setupMode = setupMode;
}
</script>

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
          Make sure that
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/macos-setup.html"
            v-if="platform === 'darwin'"
            >ESP-IDF Prerequisites for MacOS</a
          >
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html"
            v-if="platform === 'linux'"
            >ESP-IDF Prerequisites for Linux</a
          >
        </p>
        <p>are installed before choosing the setup mode.</p>
        <h2 class="subtitle">Choose a setup mode.</h2>
        <selectSaveScope />
      </div>
      <div
        class="notification install-choice"
        @click="goTo('/autoinstall', setupMode.express)"
        id="express-install-btn"
      >
        <label for="express" class="subtitle" data-config-id="express"
          >EXPRESS</label
        >
        <p name="express">
          Fastest option. Choose ESP-IDF, ESP-IDF Tools directory and python
          executable to create ESP-IDF.
        </p>
      </div>
      <div
        class="notification install-choice"
        @click="goTo('/autoinstall', setupMode.advanced)"
        id="advanced-install-btn"
      >
        <label for="advanced" class="subtitle" data-config-id="advanced"
          >ADVANCED</label
        >
        <p name="advanced">
          Configurable option. Choose ESP-IDF, ESP-IDF Tools directory and
          python executable to create ESP-IDF. <br />
          Can choose ESP-IDF Tools download or manually input each existing
          ESP-IDF tool path.
        </p>
      </div>
      <div
        class="notification install-choice"
        @click="goTo('/existingsetup', setupMode.existing)"
        id="existing-install-btn"
      >
        <label for="existing" class="subtitle" data-config-id="existing-setup"
          >USE EXISTING SETUP</label
        >
        <p>
          Select existing ESP-IDF setup saved in the extension or find ESP-IDF
          in your system.
        </p>
      </div>
    </div>
  </div>
</template>

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
./types