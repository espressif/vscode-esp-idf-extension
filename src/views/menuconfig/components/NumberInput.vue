<script setup lang="ts">
import { Menu } from "../../../espIdf/menuconfig/Menu";
import { IconInfo } from "@iconify-prerendered/vue-codicon";
import { Ref, ref } from "vue";

const props = defineProps<{
  config: Menu;
}>();

const emit = defineEmits<{
  (e: "change", value: number): void;
}>();

let isHelpVisible: Ref<boolean> = ref(false);

function toggleHelp() {
  isHelpVisible.value = !isHelpVisible.value;
}

function onChange(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("change", Number(target.value));
}
</script>

<template>
  <div class="form-group">
    <div class="field has-addons">
      <label v-text="props.config.title" @click="toggleHelp" />
      <div class="control">
        <div class="info-icon" @click="toggleHelp">
          <IconInfo />
        </div>
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <input
          v-model="props.config.value"
          :data-config-id="props.config.id"
          type="number"
          class="vscode-input"
          placeholder="0"
          @change="onChange"
          @wheel.prevent
        />
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
  margin-top: 9px;
  margin-bottom: 9px;
}

.field {
  margin-bottom: 0.5rem;
}

.vscode-input {
  width: 30rem;
  padding: 4px 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  height: 25px;
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

/* Remove spinner buttons from number input */
.vscode-input::-webkit-outer-spin-button,
.vscode-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
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
