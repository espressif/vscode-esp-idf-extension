<template>
  <div class="tool">
    <label :for="tool.id">Tool: {{ tool.name }}</label>
    <br />
    <br />
    <input
      type="text"
      v-model="tool.path"
      :id="tool.id"
      @change="setIsValid(false)"
      @keydown="setIsValid(false)"
    />
    <br />
    <br />
    <label>Environment variables for {{ tool.name }}</label>
    <br />
    <br />
    <div v-for="(item, key) in tool.env" :key="key">
      <label :for="key">{{ key }}</label>
      <br />
      <br />
      <input
        type="text"
        v-model="tool.env[key]"
        :id="key"
        @change="setIsValid(false)"
        @keydown="setIsValid(false)"
      />
      <br />
      <br />
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
