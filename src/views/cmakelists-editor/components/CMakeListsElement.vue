<script setup lang="ts">
import { CmakeListsElement } from '../../../cmake/cmakeListsElement';

defineProps<{
  el: CmakeListsElement
}>();

const emit = defineEmits(['deleteElem']);

function deleteElem() {
  emit('deleteElem');
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