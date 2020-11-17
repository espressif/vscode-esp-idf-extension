<template>
  <div class="tool-check-result" :key="tool.id">
    <div class="result-description">
      <p class="subtitle">{{ tool.id }}</p>
      <p class="result-description-small">Expected {{ tool.expected }}</p>
      <p class="result-description-small">Found {{ tool.actual }}</p>
    </div>
    <div class="control is-small centered-icon">
      <div class="icon is-large is-size-4">
        <iconify-icon :icon="tool.doesToolExist ? 'check' : 'close'" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import { IToolVersionResult } from "../store/types";

@Component
export default class ToolCheck extends Vue {
  @Prop() tool: IToolVersionResult;
}
</script>

<style scoped>
.tool-check-result {
  display: inline-flex;
  border: 1px solid;
  margin: 1%;
  padding: 0% 2%;
}
.tool-check-result .result-description {
  width: 20em;
}
.result-description-small {
  margin-left: 5%;
  white-space: pre-line;
}

.centered-icon {
  justify-content: center;
  display: flex;
  flex-direction: column;
}
</style>
