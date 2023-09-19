<script setup lang="ts">
import { IEspIdfTool } from "../types";
import { IconCheck, IconClose } from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  tool: IEspIdfTool;
}>();

function setToolsAreInValid() {
  props.tool.doesToolExist = false;
}
</script>

<template>
  <div class="toolsMetadata">
    <div class="field">
      <label class="label" :for="tool.id"
        >Tool: {{ tool.name }} Version: {{ tool.actual }}</label
      >
      <div class="field is-grouped align-center">
        <div class="control expanded">
          <input
            type="text"
            class="input is-small"
            v-model="tool.path"
            :id="tool.id"
            @change="setToolsAreInValid"
            @keydown="setToolsAreInValid"
          />
        </div>
        <div class="control">
          <div class="icon is-large is-size-4">
            <IconCheck v-if="tool.doesToolExist" />
            <IconClose v-else />
          </div>
        </div>
      </div>
    </div>
    <div v-for="(item, key) in tool.env" :key="key">
      <div class="field">
        <label :for="key" class="label">Environment variable {{ key }}:</label>
        <div class="control expanded">
          <input
            type="text"
            class="input is-small env-input"
            v-model="tool.env[key]"
            :id="key"
            @change="setToolsAreInValid"
            @keydown="setToolsAreInValid"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolsMetadata {
  width: 100%;
}
.env-input {
  margin-right: 5%;
}
</style>
