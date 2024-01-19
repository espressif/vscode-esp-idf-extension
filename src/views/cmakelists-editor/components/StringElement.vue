<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";

const emit = defineEmits(["delete"]);
defineProps<{
  el: CmakeListsElement;
}>();
function del() {
  emit("delete");
}
</script>

<template>
  <div class="cmake-element">
    <div class="field">
      <div class="control is-flex">
        <label :for="el.title" class="label">{{ el.title }} </label>
        <a class="delete" @click="del"></a>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <input type="text is-small" v-model="el.value" class="input" />
      </div>
    </div>
  </div>
</template>
