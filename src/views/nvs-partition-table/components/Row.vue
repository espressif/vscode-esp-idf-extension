<script setup lang="ts">
import { computed } from "vue";
import { IconQuestion, IconTrash } from "@iconify-prerendered/vue-codicon";
import { findEncodingTypes } from "../util";

const props = defineProps<{
  encoding: string;
  rowKey: string;
  rowType: string;
  rowValue: string;
  rowError: string;
  canDeleteRow: boolean;
}>();

const emit = defineEmits<{
  (e: 'updateRow', field: string, value: string): void;
  (e: 'delete'): void;
  (e: 'showError', error: string): void;
}>();

const encodingTypes = computed(() => {
  return findEncodingTypes(props.rowType);
});

const types = ["data", "file", "namespace"];
</script>

<template>
  <tr :class="{ error: props.rowError }">
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Key"
        maxlength="15"
        :value="props.rowKey"
        @input="$emit('updateRow', 'key', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <select
        class="vscode-select"
        :value="props.rowType"
        @change="$emit('updateRow', 'type', ($event.target as HTMLSelectElement)?.value)"
      >
        <option v-for="t in types" :value="t"> {{ t }}</option>
      </select>
    </td>
    <td class="w-md">
      <select
        class="vscode-select"
        :value="props.encoding"
        @change="$emit('updateRow', 'encoding', ($event.target as HTMLSelectElement)?.value)"
        v-if="props.rowType !== 'namespace'"
      >
        <option v-for="t in encodingTypes" :value="t"> {{ t }}</option>
      </select>
    </td>
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Value"
        :value="props.rowValue"
        @input="$emit('updateRow', 'value', ($event.target as HTMLInputElement)?.value)"
        v-if="props.rowType !== 'namespace'"
      />
    </td>
    <td>
      <div class="button-wrapper">
        <button class="vscode-button-icon-only" @click="$emit('delete')" title="Delete" v-show="props.canDeleteRow">
          <IconTrash />
        </button>
      </div>
    </td>
    <td>
      <div class="button-wrapper">
        <span
          class="icon is-small error-icon-clickable"
          v-if="props.rowError"
          @click="$emit('showError', props.rowError)"
          title="Click to view error details"
        >
          <IconQuestion />
        </span>
      </div>
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

/* VSCode-style text input */
.vscode-input {
  height: 28px;
  padding: 0 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  width: 100%;
  box-sizing: border-box;
}

.vscode-input:hover {
  border-color: var(--vscode-input-border);
}

.vscode-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

/* VSCode-style select */
.vscode-select {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  padding-right: 24px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 16px;
}

.vscode-select:hover {
  border-color: var(--vscode-input-border);
}

.vscode-select:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-select option {
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
}

.button-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 28px;
}

/* VSCode-style icon-only button */
.vscode-button-icon-only {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 2px;
  cursor: pointer;
  margin: 0;
}

.vscode-button-icon-only:hover, .vscode-button-icon-only:focus {
  background: var(--vscode-list-hoverBackground);
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-button-icon-only :deep(svg) {
  width: 18px;
  height: 18px;
  color: var(--vscode-foreground);
}

.vscode-button-icon-only:hover :deep(svg) {
  color: var(--vscode-foreground);
}

/* Error icon styling */
.error-icon-clickable {
  color: var(--vscode-errorForeground);
  cursor: pointer;
}

.error-icon-clickable:hover {
  color: var(--vscode-errorForeground);
  opacity: 0.8;
}

/* Table cell styles */
td {
  padding: 4px 8px;
  vertical-align: middle;
}
</style>
