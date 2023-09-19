<script setup lang="ts">
import { computed } from 'vue';
import { IconQuestion } from "@iconify-prerendered/vue-codicon";
import vSelect from "vue-select";
import { findEncodingTypes } from '../util';

const props = defineProps<{
  encoding: string;
  rowKey: string;
  rowType: string;
  rowValue: string;
  rowError: string;
  updateEncoding: (index: string, newtype: string) => void;
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
        @input="$emit('update:rowKey', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <vSelect
        :options="types"
        :value="rowType"
        placeholder="Type"
        taggable
        selectOnTab
        @input="updateEncoding"
      />
    </td>
    <td class="w-md">
      <vSelect
        :options="encodingTypes"
        :value="encoding"
        placeholder="Encoding"
        taggable
        selectOnTab
        @input="$emit('update:encoding', ($event.target as HTMLSelectElement)?.value)"
      />
    </td>
    <td>
      <input
        class="input is-size-7-mobile is-size-7-tablet"
        type="text"
        placeholder="Value"
        :value="rowValue"
        @input="$emit('update:rowValue', ($event.target as HTMLInputElement)?.value)"
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
@import "~vue-select/dist/vue-select.css";
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


