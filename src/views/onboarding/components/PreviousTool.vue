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
          @change="setPreviousIsValid(false)"
          @keydown="setPreviousIsValid(false)"
        />
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
            @change="setPreviousIsValid(false)"
            @keydown="setPreviousIsValid(false)"
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
import { ITool } from "../../../ITool";

@Component
export default class PreviousTool extends Vue {
  @Prop() tool: ITool;
  @Mutation private setPreviousIsValid;
}
</script>

<style scoped>
.toolsMetadata input {
  width: -webkit-fill-available;
}
</style>
