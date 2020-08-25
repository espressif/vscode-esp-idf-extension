<template>
  <div class="toolsMetadata">
    <div class="field">
      <label :for="tool.id"
        >Tool: {{ tool.name }} Version: {{ tool.version }}</label
      >
      <div class="control">
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
        <div class="icon">
          <i
            :class="
              tool.doesToolExist
                ? 'codicon codicon-check'
                : 'codicon codicon-close'
            "
          ></i>
        </div>
      </div>
    </div>
    <div v-for="(item, key) in tool.env" :key="key">
      <div class="field">
        <label :for="key">Environment variable {{ key }}:</label>
        <div class="control">
          <input
            type="text"
            class="input is-small"
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

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { Mutation, State } from "vuex-class";
import { IEspIdfTool } from "../../types";

@Component
export default class PreviousTool extends Vue {
  @Prop() tool: IEspIdfTool;
  @Mutation private setToolsAreValid;

  setToolsAreInValid() {
    this.tool.doesToolExist = false;
  }
}
</script>

<style scoped>
.toolsMetadata input {
  width: -webkit-fill-available;
}
</style>
