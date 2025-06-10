<template>
  <label
    :class="['vscode-checkbox', { checked }]"
    role="checkbox"
    :aria-checked="checked.toString()"
  >
    <input
      type="checkbox"
      :id="id"
      :checked="checked"
      :data-config-id="id"
      @change="onChange"
      ref="input"
      style="display: none;"
    />
    <span class="icon">
      <i class="codicon codicon-check icon-checked" v-if="checked"></i>
    </span>
    <div class="field has-addons"><slot></slot></div>
  </label>
</template>

<script setup>
import { ref, defineEmits, defineProps } from "vue";

const props = defineProps({
  id: { type: String, required: true },
  modelValue: { type: Boolean, default: false },
  onChange: { type: Function, default: null },
});

const checked = ref(props.modelValue);
const emits = defineEmits(["update:modelValue"]);

function onChange(event) {
  checked.value = event.target.checked;
  emits("update:modelValue", checked.value);
  if (props.onChange) {
    props.onChange(event);
  }
}
</script>

<style scoped>
.vscode-checkbox {
  display: inline-flex;
  align-items: center;
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
  margin-left: 0;
  margin-right: 9px;
  padding: 0;
  pointer-events: none;
  position: relative;
  width: 18px;
}

.vscode-checkbox input[type="checkbox"]:hover + .icon {
  border-color: var(--vscode-focusBorder, #007acc);
}

.vscode-checkbox:focus-within .icon {
  border-color: var(--vscode-focusBorder);
}
</style>
