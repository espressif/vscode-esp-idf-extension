<script setup lang="ts">
import { useSetupStore } from "../store";
import { computed } from "vue";
const store = useSetupStore();

const configurationSettingLocation = computed(() => {
  switch (store.saveScope) {
    case 1:
      return "User Settings.";
    case 2:
      return "Workspace Settings.";
    case 3:
      return "a Workspace Folder Settings.";
  }
});
</script>

<template>
  <div id="select-py-version">
    <div class="field">
      <div class="control centerize">
        <label
          for="python-version-select"
          class="label"
          title="Use the ESP-IDF: Select where to save configuration settings command to change where to save this setup settings."
        >
          Configuration settings will be saved in
          {{ configurationSettingLocation }}</label
        >
      </div>
    </div>
  </div>
</template>
