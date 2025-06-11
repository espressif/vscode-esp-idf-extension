<script setup lang="ts">
import { Menu } from "../../../espIdf/menuconfig/Menu";
import { IconInfo } from "@iconify-prerendered/vue-codicon";
import { Ref, ref, watch } from "vue";

const props = defineProps<{
  config: Menu;
}>();

const emit = defineEmits<{
  (e: "change", value: boolean): void;
}>();

let isHelpVisible: Ref<boolean> = ref(false);
const isChecked = ref(props.config.value);

watch(
  () => props.config.value,
  (newValue) => {
    isChecked.value = newValue;
  }
);

function toggleHelp() {
  isHelpVisible.value = !isHelpVisible.value;
}

function onChange(e: Event) {
  const target = e.target as HTMLInputElement;
  isChecked.value = target.checked;
  props.config.value = target.checked;
  emit("change", target.checked);
}
</script>

<template>
  <div class="form-group">
    <div class="field">
      <div style="display: flex; align-items: center;">
        <div class="checkbox-wrapper">
          <label
            :class="['vscode-checkbox', { checked: isChecked }]"
            role="checkbox"
            :aria-checked="isChecked.toString()"
          >
            <input
              type="checkbox"
              :id="props.config.id"
              :checked="isChecked"
              @change="onChange"
              style="display: none;"
            />
            <span class="icon">
              <i
                class="codicon codicon-check icon-checked"
                v-if="isChecked"
              ></i>
            </span>
          </label>
          <label :for="props.config.id" v-text="props.config.title" />
        </div>
        <div class="control">
          <div class="info-icon" @click="toggleHelp">
            <IconInfo />
          </div>
        </div>
      </div>
    </div>

    <p v-show="isHelpVisible" class="help-kconfig-title">
      KCONFIG Name:
      <label style="font-weight: 900;">{{ props.config.name }}</label>
    </p>
    <div v-show="isHelpVisible" class="content" v-html="props.config.help" />
  </div>
</template>

<style scoped>
.form-group {
  padding-left: 30px;
  overflow: hidden;
  margin-bottom: 0.5em;
}

.field {
  margin-bottom: 0.5rem;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

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

.info-icon {
  margin-left: 5px;
  cursor: pointer;
}

.info-icon:hover {
  color: var(--vscode-textLink-activeForeground);
}

.content {
  padding: 0 18px;
  overflow: hidden;
  transition: max-height 0.2s ease-out;
  margin: 10px;
}

.help-kconfig-title {
  padding: 0 18px;
  margin-left: 10px;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}
</style>
