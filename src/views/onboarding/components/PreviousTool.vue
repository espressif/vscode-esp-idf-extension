<template>
  <div class="toolsMetadata">
    <label :for="tool.id"
      >Tool: {{ tool.name }} Version: {{ tool.version }}</label
    >
    <br /><br />
    <input
      type="text"
      v-model="tool.path"
      :id="tool.id"
      @change="setPreviousIsValid(false)"
      @keydown="setPreviousIsValid(false)"
    />
    <br /><br />
    <div v-for="(item, key) in tool.env" :key="key">
      <label :for="key">Environment variable {{ key }}:</label>
      <br /><br />
      <input
        type="text"
        v-model="tool.env[key]"
        :id="key"
        @change="setPreviousIsValid(false)"
        @keydown="setPreviousIsValid(false)"
      />
      <br /><br />
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
