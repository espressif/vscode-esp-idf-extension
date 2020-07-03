<template>
  <div class="content">
    <div class="field">
      <label :for="tool.id">Tool: {{ tool.name }}</label>
      <div class="control">
        <input
          type="text"
          v-model="tool.path"
          :id="tool.id"
          @change="setIsValid(false)"
          @keydown="setIsValid(false)"
          class="input is-small"
        />
      </div>
    </div>
    <label class="subtitle" v-if="tool.env && Object.keys(tool.env).length > 0"
      >Environment variables for {{ tool.name }}</label
    >
    <div v-for="(item, key) in tool.env" :key="key" class="field">
      <label :for="key">{{ key }}</label>
      <div class="control">
        <input
          type="text"
          v-model="tool.env[key]"
          :id="key"
          @change="setIsValid(false)"
          @keydown="setIsValid(false)"
          class="input is-small"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { ITool } from "../../../ITool";
import { Mutation } from "vuex-class";

@Component
export default class Tool extends Vue {
  @Prop() public tool: ITool;
  @Mutation private setIsValid;
}
</script>

<style scoped>
input {
  width: -webkit-fill-available;
}
select {
  width: 100%;
}
</style>
