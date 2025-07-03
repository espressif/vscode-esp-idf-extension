<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  selectValue: any;
  title: string;
  options: { name: string; value: any }[];
  customOption?: { name: string; value: any };
  customValueModel?: string;
  updateMethod: (sections: string[], newValue: any) => void;
  sections: string[];
  customValueSections?: string[];
}>();

let isCustomValue = computed(() => {
  return (
    props.selectValue &&
    props.customOption &&
    typeof props.selectValue === "string" &&
    props.selectValue.indexOf(props.customOption.value) !== -1
  );
});

let selectedValue = computed({
  get() {
    return props.selectValue;
  },
  set(newVal: any) {
    props.updateMethod(props.sections, newVal);
  }
});

let customValue = computed({
  get() {
    return props.customValueModel ? props.customValueModel : "";
  },
  set(newVal: string) {
    if (props.customValueSections) {
      props.updateMethod(props.customValueSections, newVal);
    }
  }
});
</script>

<template>
  <div class="settings-item">
    <label class="settings-label">{{ props.title }}</label>
    <div class="settings-control">
      <div class="select-wrapper">
        <select v-model="selectedValue" class="vscode-select">
          <option v-for="opt of props.options" :value="opt.value" :key="opt.name">
            {{ opt.name }}
          </option>
        </select>
      </div>
    </div>
    <div class="settings-control" v-if="isCustomValue">
      <input
        type="text"
        v-model="customValue"
        class="vscode-input"
        placeholder="Enter custom value"
      />
    </div>
  </div>
</template>

<style scoped>
.settings-item {
  margin-bottom: 1.5rem;
}

.settings-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin-bottom: 0.5rem;
}

.settings-control {
  width: 100%;
  max-width: 600px;
  margin-bottom: 0.5rem;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.vscode-select {
  width: 100%;
  height: 32px;
  padding: 4px 8px;
  padding-right: 24px;
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%238C8C8C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.vscode-select:hover {
  background-color: var(--vscode-dropdown-background);
  border-color: var(--vscode-dropdown-border);
}

.vscode-select:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-select option {
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
}

.vscode-input {
  width: 100%;
  height: 32px;
  padding: 4px 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
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

.select-icon :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
