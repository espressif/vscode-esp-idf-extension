<script setup lang="ts">
import { Icon } from "@iconify/vue";

const props = defineProps<{
  title: string;
  elements: { [key: string]: string };
}>();

let valueToPush: string = "";

function removeElement(dictKey: string) {
  delete props.elements[dictKey];
}

function addToDictionary() {
  if (valueToPush != "") {
    props.elements[valueToPush] = "";
    valueToPush = "";
  }
}
</script>

<template>
  <div class="block">
    <div class="field">
      <div class="control is-flex">
        <label class="label">{{ title }} </label>
      </div>
      <ul class="small-margin">
        <li
          v-for="confKey in Object.keys(elements)"
          :key="confKey"
          class="field is-grouped"
        >
          <div class="control is-flex">
            <label :for="elements[confKey]" class="label"
              >{{ confKey }} :</label
            >
          </div>
          <div class="control">
            <input
              type="text is-small"
              v-model="elements[confKey]"
              class="input"
            />
          </div>
          <div class="icon" @click="removeElement(confKey)">
            <Icon icon="close" />
          </div>
        </li>
      </ul>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <input
          type="text is-small"
          v-model="valueToPush"
          class="input"
          @keyup.enter="addToDictionary"
          placeholder="enter key name"
        />
      </div>
      <div class="control">
        <div class="icon" @click="addToDictionary">
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
.icon:hover {
  background-color: var(--vscode-button-background);
}
</style>
