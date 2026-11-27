<script setup lang="ts">
import { computed } from "vue";
import { IconQuestion, IconTrash } from "@iconify-prerendered/vue-codicon";

const APP_SUBTYPES = [
  "factory",
  "test",
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
];

const DATA_SUBTYPES = [
  "ota",
  "phy",
  "nvs",
  "nvs_keys",
  "efuse",
  "coredump",
  "fat",
  "spiffs",
  "littlefs",
];

const props = defineProps<{
  sName: string;
  sType: string;
  sSubType: string;
  sOffset: string;
  sSize: string;
  sFlag: boolean;
  sReadOnly: boolean;
  error: string;
  layout?: {
    offset: number;
    size: number;
    minSize: number;
    maxSize: number;
    step: number;
    reclaimable: number;
    canFit: boolean;
    recommended?: number;
  };
}>();

const emit = defineEmits<{
  (e: "updateRow", field: string, value: string | boolean): void;
  (e: "delete"): void;
  (e: "showError", error: string): void;
  (e: "setSize", bytes: number): void;
  (e: "reclaim"): void;
  (e: "fit"): void;
  (e: "recommended"): void;
}>();

const typeChoice = computed(() => {
  if (props.sType === "app" || props.sType === "data") {
    return props.sType;
  }
  if (!props.sType) {
    return "";
  }
  return "custom";
});

const subtypes = computed(() => {
  if (props.sType === "app") {
    return APP_SUBTYPES;
  }
  if (props.sType === "data") {
    return DATA_SUBTYPES;
  }
  return [];
});

const canDecrease = computed(() => {
  if (!props.layout) {
    return false;
  }
  return props.layout.size > props.layout.minSize;
});

const canIncrease = computed(() => {
  if (!props.layout) {
    return false;
  }
  return props.layout.size < props.layout.maxSize;
});

function onTypeChoice(value: string) {
  if (value === "app") {
    emit("updateRow", "type", "app");
    if (!APP_SUBTYPES.includes(props.sSubType)) {
      emit("updateRow", "subtype", "factory");
    }
    return;
  }
  if (value === "data") {
    emit("updateRow", "type", "data");
    if (!DATA_SUBTYPES.includes(props.sSubType)) {
      emit("updateRow", "subtype", "nvs");
    }
    return;
  }
  if (value === "custom") {
    const nextType =
      props.sType === "app" || props.sType === "data" || !props.sType
        ? "0x40"
        : props.sType;
    emit("updateRow", "type", nextType);
    if (!/^0x[0-9a-fA-F]+$/i.test(props.sSubType)) {
      emit("updateRow", "subtype", "0x00");
    }
  }
}

function onSlide(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(value)) {
    emit("setSize", value);
  }
}

function stepBy(direction: number) {
  if (!props.layout) {
    return;
  }
  emit("setSize", props.layout.size + direction * props.layout.step);
}

function hexOffset(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`;
}
</script>

<template>
  <tr :class="{ error: props.error }">
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Name"
        maxlength="16"
        :value="props.sName"
        @input="$emit('updateRow', 'name', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <select
        class="vscode-select"
        :value="typeChoice"
        @change="onTypeChoice(($event.target as HTMLSelectElement)?.value)"
      >
        <option value="">Type</option>
        <option value="app">app</option>
        <option value="data">data</option>
        <option value="custom">custom</option>
      </select>
      <input
        v-if="typeChoice === 'custom'"
        class="vscode-input custom-field"
        type="text"
        placeholder="0x40"
        maxlength="6"
        :value="props.sType"
        @input="$emit('updateRow', 'type', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td class="w-md">
      <select
        v-if="typeChoice !== 'custom'"
        class="vscode-select"
        :value="props.sSubType"
        @change="$emit('updateRow', 'subtype', ($event.target as HTMLSelectElement)?.value)"
      >
        <option v-for="t in subtypes" :value="t"> {{ t }}</option>
      </select>
      <input
        v-else
        class="vscode-input"
        type="text"
        placeholder="0x00"
        maxlength="6"
        :value="props.sSubType"
        @input="$emit('updateRow', 'subtype', ($event.target as HTMLInputElement)?.value)"
      />
    </td>
    <td>
      <input
        class="vscode-input"
        type="text"
        placeholder="Offset"
        :value="props.sOffset"
        @input="$emit('updateRow', 'offset', ($event.target as HTMLInputElement)?.value)"
      />
      <p v-if="!props.sOffset && props.layout" class="offset-hint">
        {{ hexOffset(props.layout.offset) }}
      </p>
    </td>
    <td class="size-cell">
      <input
        class="vscode-input"
        type="text"
        placeholder="Size"
        :value="props.sSize"
        @input="$emit('updateRow','size', ($event.target as HTMLInputElement)?.value)"
      />
      <div v-if="props.layout" class="size-modifier">
        <div class="size-slider">
          <button
            type="button"
            class="size-step"
            title="Decrease size"
            :disabled="!canDecrease"
            @click="stepBy(-1)"
          >
            −
          </button>
          <input
            class="size-range"
            type="range"
            aria-label="Partition size"
            :min="props.layout.minSize"
            :max="props.layout.maxSize"
            :step="props.layout.step"
            :value="props.layout.size >= props.layout.minSize ? props.layout.size : props.layout.minSize"
            @input="onSlide"
          />
          <button
            type="button"
            class="size-step"
            title="Increase size"
            :disabled="!canIncrease"
            @click="stepBy(1)"
          >
            +
          </button>
        </div>
        <div class="size-actions">
          <button
            type="button"
            class="size-action"
            title="Take the free gap immediately after this partition"
            :disabled="props.layout.reclaimable <= 0"
            @click="$emit('reclaim')"
          >
            Reclaim
          </button>
          <button
            type="button"
            class="size-action"
            title="Grow to the remaining flash"
            :disabled="!props.layout.canFit"
            @click="$emit('fit')"
          >
            Fit
          </button>
          <button
            v-if="props.layout.recommended"
            type="button"
            class="size-action"
            title="Snap to the recommended minimum size"
            @click="$emit('recommended')"
          >
            Recommended
          </button>
        </div>
      </div>
    </td>
    <td>
      <div class="flag-list">
        <label class="flag-option">
          <span
            class="vscode-checkbox"
            role="checkbox"
            :aria-checked="props.sFlag"
          >
            <input
              type="checkbox"
              :checked="props.sFlag"
              @change="$emit('updateRow', 'flag', ($event.target as HTMLInputElement)?.checked)"
              style="display: none;"
            />
            <span class="icon" :class="{ 'is-checked': props.sFlag }">
              <span class="check-mark" v-if="props.sFlag">✓</span>
            </span>
          </span>
          <span>Encrypted</span>
        </label>
        <label class="flag-option">
          <span
            class="vscode-checkbox"
            role="checkbox"
            :aria-checked="props.sReadOnly"
          >
            <input
              type="checkbox"
              :checked="props.sReadOnly"
              @change="$emit('updateRow', 'readOnly', ($event.target as HTMLInputElement)?.checked)"
              style="display: none;"
            />
            <span class="icon" :class="{ 'is-checked': props.sReadOnly }">
              <span class="check-mark" v-if="props.sReadOnly">✓</span>
            </span>
          </span>
          <span>Read-only</span>
        </label>
      </div>
    </td>
    <td>
      <div class="button-wrapper">
        <button
          class="vscode-button-icon-only"
          @click="$emit('delete')"
          title="Delete"
        >
          <IconTrash />
        </button>
      </div>
    </td>
    <td>
      <div class="button-wrapper">
        <span
          class="icon is-small error-icon-clickable"
          v-show="props.error"
          @click="$emit('showError', props.error)"
          title="Click to view error details"
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
.custom-field {
  margin-top: 6px;
}
.offset-hint {
  margin: 4px 0 0;
  color: var(--vscode-descriptionForeground);
  font-size: 11px;
}
.size-cell {
  min-width: 220px;
}
.size-modifier {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.size-slider {
  display: flex;
  align-items: center;
  gap: 6px;
}
.size-range {
  flex: 1;
  min-width: 80px;
  accent-color: var(--vscode-button-background);
}
.size-step,
.size-action {
  height: 22px;
  padding: 0 8px;
  background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
  color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
  border: none;
  border-radius: 2px;
  font-size: 11px;
  cursor: pointer;
}
.size-step:disabled,
.size-action:disabled {
  opacity: 0.45;
  cursor: default;
}
.size-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.flag-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.flag-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
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
.checkbox-wrapper,
.button-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 28px;
}

.button-wrapper {
  position: relative;
}

.vscode-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  font-family: var(
    --vscode-font-family,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Helvetica,
    Arial,
    sans-serif
  );
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

.vscode-button-icon-only:hover,
.vscode-button-icon-only:focus {
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
  margin-left: 8px;
}

.error-icon-clickable:hover {
  color: var(--vscode-errorForeground);
  opacity: 0.8;
}
</style>
