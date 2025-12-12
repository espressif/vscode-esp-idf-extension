<script setup lang="ts">
import { Menu } from "../../../espIdf/menuconfig/Menu";
import { IconInfo, IconDebugRestart } from "@iconify-prerendered/vue-codicon";
import { Ref, ref } from "vue";

const props = defineProps<{
  config: Menu;
  canReset: boolean;
}>();

const emit = defineEmits<{
  (e: "change", value: string): void;
  (e: "resetElement", children: string[]): void;
}>();

let isHelpVisible: Ref<boolean> = ref(false);

function toggleHelp() {
  isHelpVisible.value = !isHelpVisible.value;
}

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  emit("change", target.value);
}

function resetElement() {
  emit(
    "resetElement",
    props.config.children.map((child) => child.id)
  );
}
</script>

<template>
  <div class="form-group">
    <div class="field">
      <div class="field has-addons">
        <label v-text="props.config.title" @click="toggleHelp" />
        <div class="control">
          <div class="info-icon" @click="toggleHelp">
            <IconInfo />
          </div>
          <div
            class="info-icon reset-icon"
            @click="resetElement()"
            v-if="props.canReset"
          >
            <IconDebugRestart />
          </div>
        </div>
      </div>
      <div class="field">
        <div class="control">
          <div class="select-wrapper">
            <select
              v-model="props.config.value"
              @change="onChange"
              :data-config-id="props.config.id"
              class="vscode-select"
            >
              <option
                v-for="option in props.config.children"
                :key="option.id"
                :value="option.id"
                v-show="option.isVisible"
              >
                {{ option.title }}
              </option>
            </select>
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
}

.field {
  margin-bottom: 0.05rem;
}

.info-icon {
  margin-left: 5px;
  cursor: pointer;
}

.info-icon:hover {
  color: var(--vscode-textLink-activeForeground);
}

.control {
  display: flex;
  align-items: center;
}

.reset-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.field:hover .reset-icon {
  opacity: 1;
}

.select-wrapper {
  position: relative;
  width: 30rem;
}

.vscode-select {
  width: 100%;
  padding: 2px 8px;
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
  padding-right: 24px;
  height: 26px;
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
