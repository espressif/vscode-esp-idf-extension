<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";
import { Icon } from "@iconify/vue";

let elementValueToPush = "";
const props = defineProps<{
  el: CmakeListsElement;
}>();
function removeFromArray(value) {
  const index = props.el.value.indexOf(value);
  props.el.value.splice(index, 1);
}

function addToArray() {
  if (!!elementValueToPush) {
    props.el.value.push(elementValueToPush);
    elementValueToPush = "";
  }
}
const emit = defineEmits(["delete"]);

function del() {
  emit("delete");
}
</script>

<template>
  <div>
    <div class="field">
      <div class="control is-flex">
        <label :for="el.title" class="label">{{ el.title }} </label>
        <a class="delete" @click="del"></a>
      </div>
      <ul>
        <li v-for="v in el.value" :key="v" class="field is-grouped">
          <p class="label">{{ v }}</p>
          <div class="icon" @click="removeFromArray(v)">
            <Icon icon="close" />
          </div>
        </li>
      </ul>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <input
          type="text is-small"
          v-model="elementValueToPush"
          class="input"
          @keyup.enter="addToArray"
        />
      </div>
      <div class="control">
        <div class="icon" @click="addToArray">
          <Icon icon="add" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.is-grouped {
  align-items: center;
}
li.is-grouped .icon {
  margin-bottom: 0.5em;
}
</style>
