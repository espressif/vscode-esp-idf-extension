<script setup lang="ts">
import { useSetupStore } from "./store";
import { router } from "./main";
import { SetupMode } from "../setup/types";
import { computed } from "vue";

const store = useSetupStore();

const setupMode = computed(() => {
  return SetupMode;
});

const isVersionLowerThan5 = (version: string): boolean => {
    if (!version) return false;
    const versionParts = version.split(".");
    const majorVersion = Number(versionParts[0]);
    return majorVersion < 5;
  }

function goTo(route: string, setupMode: SetupMode) {
  router.push(route);
  store.setupMode = setupMode;
}
</script>

<template>
  <div class="notification">
    <div class="field install-btn">
      <div class="control">
        <button
          @click="store.cleanIdfSetups"
          class="button"
          data-config-id="start-install-btn"
        >
          Clean IDF Setups
        </button>
      </div>
    </div>
    <div
      class="notification install-choice"
      @click="goTo('/autoinstall', setupMode.express)"
    >
      <label class="subtitle"> Search ESP-IDF in system</label>
    </div>
    <div
      v-for="(prevSetup, i) in store.idfSetups"
      :key="prevSetup.id"
      class="my-1"
    >
      <div
        class="notification install-choice"
        v-show="prevSetup.isValid"
        :data-config-id="prevSetup.idfPath"
        @click="store.useIdfSetup(i)"
      >
        <label :for="prevSetup.id" class="subtitle">
          {{ prevSetup.idfPath }}</label
        >
        <p>IDF Version: {{ prevSetup.version }}</p>
        <p>Python path: {{ prevSetup.python }}</p>
        <p>IDF Tools path: {{ prevSetup.toolsPath }}</p>
        <p>Git path: {{ prevSetup.gitPath }}</p>
        <p v-if="isVersionLowerThan5(prevSetup.version)" class="warning-text">
          Whitespaces in project, ESP-IDF and ESP Tools paths are not supported in versions lower than 5.0
        </p>
      </div>
    </div>
  </div>
</template>
./types

<style scoped>
.warning-text {
  color: var(--vscode-editorWarning-foreground);
  font-size: small;
  
}
</style>