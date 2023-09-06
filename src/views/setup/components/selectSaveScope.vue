<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useSetupStore } from '../store';
const store = useSetupStore();

const { saveScope } = storeToRefs(store);
</script>

<template>
  <div id="select-py-version">
    <div class="field">
      <div class="control centerize">
        <label for="python-version-select" class="label"
          >Select where to save these settings:</label
        >
        <div class="select">
          <select v-model="saveScope" id="settings-location-select">
            <option value="1">Global</option>
            <option value="2">Workspace</option>
            <option value="3">Workspace Folder</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>