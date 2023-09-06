<script setup lang="ts">
import { Icon } from '@iconify/vue';
const props = defineProps<{
  title: string;
  values: string[];
  addValue: (sections: string[], val: string) => void;
  removeValue: (sections: string[], i: number) => void;
  sections: string[];
}>();

let valueToPush = "";

function addToArray() {
  if (valueToPush !== "") {
    props.addValue(props.sections, valueToPush);
    valueToPush = "";
  }
}

function removeFromArray(val: any) {
  const index = props.values.indexOf(val);
  props.removeValue(props.sections, index);
}
</script>

<template>
  <div class="block">
    <div class="field">
      <div class="control is-flex">
        <label class="subtitle has-text-weight-bold">{{ title }} </label>
      </div>
      <ul class="tags">
        <li v-for="v in values" :key="v" class="tag is-custom-tag">
          <p>{{ v }}</p>
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
          v-model="valueToPush"
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
.icon:hover {
  background-color: var(--vscode-button-background);
}

.is-custom-tag {
  background-color: var(--vscode-foreground);
  color: var(--vscode-editor-background);
}
</style>
