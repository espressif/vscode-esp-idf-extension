<script setup lang="ts">
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";

const emit = defineEmits(["clearError", "delete"]);
defineProps<{
  el: CmakeListsElement;
}>();
function del() {
  emit("delete");
}

function clearError() {
  emit("clearError");
}
</script>

<template>
  <div class="py-1" :class="{ error: el.hasError }">
    <div class="field">
      <div class="control is-flex">
        <label :for="el.title" class="label">{{ el.title }} </label>
        <a class="delete" @click="del"></a>
      </div>
    </div>
    <div class="level">
      <div class="level-item">
        <div class="field fullwidth-field">
          <div class="control">
            <label class="label is-small">Target</label>
          </div>
          <div class="control">
            <input
              type="text is-small"
              v-model="el.variable"
              class="input"
              @input="clearError"
            />
          </div>
        </div>
      </div>
      <div class="level-item">
        <div class="field fullwidth-field">
          <div class="control">
            <label class="label is-small">File</label>
          </div>
          <div class="control">
            <input type="text is-small" v-model="el.value" class="input" />
          </div>
        </div>
      </div>
      <div class="level-item">
        <div class="field fullwidth-field">
          <div class="control">
            <label class="label is-small">Type</label>
          </div>
          <div class="control">
            <div class="select">
              <select v-model="el.typeValue">
                <option value="BINARY">BINARY</option>
                <option value="TEXT">TEXT</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.delete:hover {
  background-color: var(--vscode-button-background);
}
.select select {
  border-color: var(--vscode-input-background);
}

.fullwidth-field {
  width: 90%;
}
</style>
