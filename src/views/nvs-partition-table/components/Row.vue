<script setup lang="ts">
import { computed } from "vue";
import { IconQuestion } from "@iconify-prerendered/vue-codicon";
import { findEncodingTypes } from "../util";

const props = defineProps<{
  encoding: string;
  rowKey: string;
  rowType: string;
  rowValue: string;
  rowError: string;
}>();

const encodingTypes = computed(() => {
  return findEncodingTypes(props.rowType);
});

const types = ["data", "file", "namespace"];
</script>

<template>
  <tr :class="{ error: rowError }">
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Key"
        maxlength="15"
        :value="rowKey"
        @input="$emit('updateRow', 'key', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <div class="select is-size-7-mobile is-size-7-tablet">
        <select
          :value="rowType"
          @change="$emit('updateRow', 'type', ($event.target as HTMLInputElement)?.value)"
        >
          <option v-for="t in types" :value="t"> {{ t }}</option>
        </select>
      </div>
    </td>
    <td class="w-md">
      <div class="select is-size-7-mobile is-size-7-tablet">
        <select
          :value="encoding"
          @change="$emit('updateRow', 'encoding', ($event.target as HTMLSelectElement)?.value)"
        >
          <option v-for="t in encodingTypes" :value="t"> {{ t }}</option>
        </select>
      </div>
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Value"
        :value="rowValue"
        @input="$emit('updateRow', 'value', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <a class="delete" @click="$emit('delete')"></a>
      <span
        class="icon is-small has-tooltip-arrow"
        :data-tooltip="rowError"
        v-if="rowError"
      >
        <IconQuestion />
      </span>
    </td>
  </tr>
</template>

<style lang="scss">
.vs__dropdown-toggle {
  background-color: var(--vscode-input-background);
  border-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
}
.vs__open-indicator,
.vs__clear {
  fill: var(--vscode-button-background);
}
.vs--single .vs__selected {
  color: var(--vscode-foreground);
}
.vs__search {
  color: var(--vscode-foreground);
}
.vs__search::placeholder {
  color: var(--vscode-input-placeholderForeground);
}
.vs__dropdown-menu {
  background-color: var(--vscode-input-background);
  border-color: var(--vscode-input-background);
}
.vs__dropdown-option {
  color: var(--vscode-foreground);
}
.vs__dropdown-option--highlight {
  background-color: var(--vscode-button-background);
  color: var(--vscode-foreground);
}
.w-md {
  min-width: 130px;
}
.error {
  background-color: rgba(176, 81, 41, 0.1);
}
</style>
