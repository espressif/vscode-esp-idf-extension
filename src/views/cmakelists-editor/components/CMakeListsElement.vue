<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";
import StringElement from "./StringElement.vue";
import SetElement from "./SetElement.vue";
import BinaryDataElement from "./BinaryDataElement.vue";
import ArrayElement from "./ArrayElement.vue";

defineProps<{
  el: CmakeListsElement;
}>();

const emit = defineEmits(["delete"]);

function deleteElem() {
  emit("delete");
}
</script>

<template>
  <div>
    <ArrayElement :el="el" v-if="el.type === 'array'" @delete="deleteElem" />
    <BinaryDataElement
      :el="el"
      v-if="el.type === 'binary_data'"
      @delete="deleteElem"
    />
    <SetElement :el="el" v-if="el.type === 'set'" @delete="deleteElem" />
    <StringElement :el="el" v-if="el.type === 'string'" @delete="deleteElem" />
  </div>
</template>
