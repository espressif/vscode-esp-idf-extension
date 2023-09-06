<script setup lang="ts">
import { computed } from "vue";
import { useSetupStore } from "./store";
import { storeToRefs } from "pinia";
import { router } from "./main";

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
      ? `sudo cp -n ${openOCDRulesPath} /etc/udev/rules.d`
      : "";
  })
</script>

<template>
  <div id="app">
    <div
      class="control centerize"
      v-if="!isIdfInstalled && currentRoute !== '/' && currentRoute !== '/status'"
    >
      <div class="icon is-large is-size-4">
        <router-link to="/" class="button" id="home-button">
          <iconify-icon icon="home" />
        </router-link>
      </div>
    </div>
    <div class="control centerize">
      <h1 class="title is-spaced">
        <svg
          width="28"
          height="28"
          viewBox="0 0 13.94 14"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <title>1</title>
          <path
            class="cls-1"
            d="M4.64,10.41a1,1,0,1,1-1-1,1,1,0,0,1,1,1"
            transform="translate(-0.03)"
          />
          <path
            class="cls-1"
            d="M13.23,9.39A10.19,10.19,0,0,0,4.58.74a6.29,6.29,0,0,0-1.42,1v1a8.1,8.1,0,0,1,8.09,8.09h.95a6.61,6.61,0,0,0,1-1.42"
            transform="translate(-0.03)"
          />
          <path
            class="cls-1"
            d="M14,6.4A6.41,6.41,0,0,0,7.57,0a4.78,4.78,0,0,0-.66,0L6.76.46A11,11,0,0,1,13.5,7.2l.43-.15c0-.22,0-.43,0-.65"
            transform="translate(-0.03)"
          />
          <path
            class="cls-1"
            d="M7.64,14A7.61,7.61,0,0,1,0,6.39,7.56,7.56,0,0,1,2.26,1l.41.41a7,7,0,1,0,9.94,10l.41.4A7.56,7.56,0,0,1,7.64,14"
            transform="translate(-0.03)"
          />
          <path
            class="cls-1"
            d="M7.56,11.25a4.42,4.42,0,0,0-4-4.84A.4.4,0,0,1,3.24,6a.39.39,0,0,1,.43-.36,5.12,5.12,0,0,1,2.44.9,5.2,5.2,0,0,1,2.23,4.81,5.3,5.3,0,0,1-.17.9l1.15.32a6.74,6.74,0,0,0,1-.37,7.76,7.76,0,0,0,.12-1.37A7.3,7.3,0,0,0,4.23,3.59a3.17,3.17,0,0,0-1.16,0,2.41,2.41,0,0,0-1.26.76,2.49,2.49,0,0,0,1.11,4,6.22,6.22,0,0,0,.63.12h0a2.34,2.34,0,0,1,1.94,2.3,2.25,2.25,0,0,1-.37,1.26l.8.51a6.88,6.88,0,0,0,1.19.2,4.38,4.38,0,0,0,.45-1.53"
            transform="translate(-0.03)"
          />
        </svg>
        ESPRESSIF
      </h1>
      <h2 class="subtitle">ESP-IDF Extension for Visual Studio Code</h2>
    </div>
    <transition name="fade" mode="out-in" v-if="!isIdfInstalled">
      <router-view></router-view>
    </transition>
    <div class="centerize install-finished" v-if="isIdfInstalled">
      <h2 class="subtitle" data-config-id="setup-is-finished">
        All settings have been configured. You can close this window.
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
        <div class="notification" v-if="openOCDRulesPathText">
          {{ openOCDRulesPathText }}
        </div>
      </div>
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
</style>