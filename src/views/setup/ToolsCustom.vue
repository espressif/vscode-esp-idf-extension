<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSetupStore } from "./store";
import toolManual from "./components/toolManual.vue";

const store = useSetupStore();
let selectedIdfTools = ref("toolsDownload");
const allToolsAreValid = computed(() => {
  const invalidTools = store.toolsResults.filter((tool) => {
    return !tool.doesToolExist;
  });
  return invalidTools.length === 0;
});

function installIdfTools() {
  store.isIdfInstalling = true;
  store.installEspIdfTools();
}

onMounted(() => {
  const updatedToolsInfo = store.toolsResults.map((tool) => {
    if (tool.doesToolExist) {
      tool.progress = "100.00%";
      tool.hashResult = true;
    } else {
      tool.progress = "0.00%";
      tool.hashResult = false;
    }
    return tool;
  });
  store.toolsResults = updatedToolsInfo;
});
</script>

<template>
  <div id="custom-setup">
    <div class="notification">
      <div class="field">
        <label for="idf-version-select" class="label">ESP-IDF Tools</label>
        <div class="control">
          <div class="select">
            <select
              v-model="selectedIdfTools"
              data-config-id="select-esp-idf-tools"
            >
              <option value="toolsDownload">Download ESP-IDF Tools</option>
              <option value="toolsExisting">Use existing ESP-IDF Tools</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="selectedIdfTools === 'toolsDownload'">
        <ul>
          <li v-for="tool in store.toolsResults" :key="tool.id" class="label">
            <strong class="span-path">{{ tool.id }}</strong>
            <em>{{ tool.expected }}</em>
          </li>
        </ul>
        <div class="field install-btn">
          <div class="control">
            <button class="button" @click.once="installIdfTools">
              Download Tools
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedIdfTools === 'toolsExisting'">
        <toolManual
          v-for="tool in store.toolsResults"
          :key="tool.id"
          :tool="tool"
        />
        <div class="field install-btn">
          <div class="control">
            <button
              class="button"
              @click="store.saveCustomSettings"
              v-if="allToolsAreValid"
              data-config-id="save-existing-tools"
            >
              Save Settings
            </button>
            <button class="button" @click="store.checkEspIdfTools" v-else>
              Check Tools
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#custom-setup {
  margin: 1% 5%;
}
</style>
