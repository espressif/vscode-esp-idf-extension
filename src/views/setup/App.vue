<script setup lang="ts">
import { computed } from "vue";
import { useSetupStore } from "./store";
import { storeToRefs } from "pinia";
import { router } from "./main";
import { IconHome } from "@iconify-prerendered/vue-codicon";
import Logo from "./components/logo.vue";
import Welcome from "./Welcome.vue";

const store = useSetupStore();

const { isIdfInstalled, openOCDRulesPath, platform } = storeToRefs(store);

const currentRoute = computed(() => {
  return router.currentRoute.value.path;
});

const isLinuxPlatform = computed(() => {
  return platform.value.indexOf("linux") !== -1;
});

const openOCDRulesPathText = computed(() => {
  return openOCDRulesPath.value !== ""
    ? `sudo cp -n "${openOCDRulesPath.value}" /etc/udev/rules.d`
    : "";
});
</script>

<template>
  <div id="app">
    <div
      class="control centerize"
      v-if="
        !isIdfInstalled && currentRoute !== '/' && currentRoute !== '/status'
      "
    >
      <div class="icon is-large is-size-4">
        <router-link to="/" class="button" id="home-button">
          <IconHome />
        </router-link>
      </div>
    </div>
    <div class="control centerize">
      <h1 class="title is-spaced">
        <Logo size="28" />
        ESPRESSIF
      </h1>
      <h2 class="subtitle">ESP-IDF Extension for Visual Studio Code</h2>
    </div>
    <router-view v-slot="{ Component }" v-if="!isIdfInstalled">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <div class="centerize install-finished" v-if="isIdfInstalled">
      <h2 class="subtitle" data-config-id="setup-is-finished">
        All settings have been configured.
      </h2>

      <div v-if="isLinuxPlatform">
        <div class="field centerize">
          <p>
            For Linux users, OpenOCD needs to add 60-openocd.rules for
            permission delegation in USB devices to be added in
            <span class="span-path">/etc/udev/rules.d/</span>.
          </p>
          <p>Run this command in a terminal with sudo privileges:</p>
        </div>
        <div class="notification keep-spaces" v-if="openOCDRulesPathText">
          {{ openOCDRulesPathText }}
        </div>
      </div>

      <Welcome />
    </div>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";

.cls-1 {
  fill: var(--vscode-editorGutter-deletedBackground);
}

#app {
  padding: 1em;
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  height: -webkit-fill-available;
}

.align-center {
  align-items: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.progressBar {
  background-color: var(--vscode-input-background);
}

.progressBar div {
  background-color: var(--vscode-button-background);
  height: 10px;
  width: 0%;
  align-self: flex-start;
}

.span-path {
  color: var(--vscode-button-hoverBackground);
}

.keep-spaces {
  white-space: pre-wrap;
}
</style>
