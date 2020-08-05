<template>
  <div class="tool-check-result" :key="tool.id">
    <div class="result-description">
      <p class="subtitle">{{ tool.id }}</p>
      <p class="result-description-small">Expected {{ tool.expected }}</p>
      <p class="result-description-small">Found {{ tool.actual }}</p>
    </div>
    <div class="control is-small centered-icon">
      <font-awesome-icon
        icon="check"
        v-if="tool.doesToolExist"
        class="check-icon"
      />
      <font-awesome-icon icon="times" v-else class="check-icon" />
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
