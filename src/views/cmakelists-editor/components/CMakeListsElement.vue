<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";
import StringElement from "./StringElement.vue";
import SetElement from "./SetElement.vue";
import BinaryDataElement from "./BinaryDataElement.vue";
import ArrayElement from "./ArrayElement.vue";

defineProps<{
  el: CmakeListsElement;
}>();

const emit = defineEmits(["clearError", "delete"]);

function deleteElem() {
  emit("delete");
}

function clearError() {
  emit("clearError");
}
</script>

<template>
  <div class="cmake-element">
    <ArrayElement :el="el" v-if="el.type === 'array'" @delete="deleteElem" />
    <BinaryDataElement
      :el="el"
      v-if="el.type === 'binary_data'"
      @delete="deleteElem"
      @clearError="clearError"
    />
    <SetElement :el="el" v-if="el.type === 'set'" @delete="deleteElem" @clearError="clearError" />
    <StringElement :el="el" v-if="el.type === 'string'" @delete="deleteElem"/>
  </div>
</template>

<style scoped>
.cmake-element {
  background-color: var(--vscode-editor-background);
  border: 2px solid var(--vscode-panel-border);
  border-radius: 2px;
  padding: 1rem;
}
</style>
