<script setup lang="ts">
import { computed } from "vue";
import { IconQuestion, IconTrash } from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  sName: string;
  sType: string;
  sSubType: string;
  sOffset: string;
  sSize: string;
  sFlag: boolean;
  error: string;
}>();

const types = computed(() => {
  return ["app", "data"];
});

const subtypes = computed(() => {
  if (props.sType === "app") {
    return [
      "factory",
      "ota_0",
      "ota_1",
      "ota_2",
      "ota_3",
      "ota_4",
      "ota_5",
      "ota_6",
      "ota_7",
      "ota_8",
      "ota_9",
      "ota_10",
      "ota_11",
      "ota_12",
      "ota_13",
      "ota_14",
      "ota_15",
      "test",
    ];
  } else if (props.sType === "data") {
    return ["fat", "ota", "phy", "nvs", "nvs_keys", "spiffs", "coredump"];
  }
  return [];
});
</script>

<template>
  <tr :class="{ error: error }">
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Name"
        maxlength="16"
        :value="sName"
        @input="$emit('updateRow', 'name', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <select
        class="vscode-select"
        :value="sType"
        @change="$emit('updateRow', 'type', ($event.target as HTMLSelectElement)?.value)"
      >
        <option v-for="t in types" :value="t"> {{ t }}</option>
      </select>
    </td>
    <td class="w-md">
      <select
        class="vscode-select"
        :value="sSubType"
        @change="$emit('updateRow', 'subtype', ($event.target as HTMLSelectElement)?.value)"
      >
        <option v-for="t in subtypes" :value="t"> {{ t }}</option>
      </select>
    </td>
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Offset"
        :value="sOffset"
        @input="$emit('updateRow', 'offset', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Size"
        :value="sSize"
        @input="$emit('updateRow','size', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <div class="checkbox-wrapper">
        <label class="vscode-checkbox" role="checkbox" :aria-checked="sFlag.toString()">
          <input
            type="checkbox"
            :checked="sFlag"
            @change="$emit('updateRow', 'flag', ($event.target as HTMLInputElement)?.checked)"
            style="display: none;"
          />
          <span class="icon" :class="{ 'is-checked': sFlag }">
            <span class="check-mark" v-if="sFlag">✓</span>
          </span>
        </label>
      </div>
    </td>
    <td>
      <div class="button-wrapper">
        <button class="vscode-button-icon-only" @click="$emit('delete')" title="Delete">
          <IconTrash />
        </button>
        <span
          class="icon is-small has-tooltip-arrow"
          :data-tooltip="error"
          v-if="error"
        >
          <IconQuestion />
        </span>
      </div>
    </td>
  </tr>
</template>

<style>
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
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 16px;
  cursor: pointer;
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
  padding: 4px 8px;
}

.vscode-select option:hover {
  background-color: var(--vscode-list-hoverBackground);
}

/* VSCode-style checkbox */
.checkbox-wrapper, .button-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 28px;
}

.vscode-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif);
  font-size: 13px;
  color: var(--vscode-settings-checkboxForeground, #cccccc);
  outline: none;
  --check-border-color: var(--vscode-settings-checkboxBorder, #3c3c3c);
  --check-bg-color: var(--vscode-settings-checkboxBackground, #1e1e1e);
  --check-checked-bg: var(--vscode-settings-checkboxBackground, #0e639c);
  position: relative;
}

.vscode-checkbox input[type="checkbox"] {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.vscode-checkbox .icon {
  align-items: center;
  background-color: var(--vscode-settings-checkboxBackground);
  background-size: 16px;
  border: 1px solid var(--vscode-settings-checkboxBorder);
  border-radius: 3px;
  box-sizing: border-box;
  color: var(--vscode-settings-checkboxForeground);
  display: flex;
  height: 18px;
  justify-content: center;
  padding: 0;
  pointer-events: none;
  position: relative;
  width: 18px;
}

.vscode-checkbox .icon.is-checked {
  background-color: var(--vscode-settings-checkboxBackground);
  border-color: var(--vscode-focusBorder);
}

.vscode-checkbox input[type="checkbox"]:hover + .icon {
  border-color: var(--vscode-focusBorder, #007acc);
}

.vscode-checkbox:focus-within .icon {
  border-color: var(--vscode-focusBorder);
}

.vscode-checkbox .check-mark {
  color: var(--vscode-settings-checkboxForeground);
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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
</style>
