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
  (e: "resetElement", id: string): void;
}>();

let isHelpVisible: Ref<boolean> = ref(false);

function toggleHelp() {
  isHelpVisible.value = !isHelpVisible.value;
}

function onChange(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("change", target.value);
}
function resetElement(id: string) {
  emit("resetElement", id);
}
</script>

<template>
  <div class="form-group">
    <div class="field has-addons">
      <label
        v-text="props.config.title"
        :data-config-id="props.config.id"
        @click="toggleHelp"
      />
      <div class="info-icon" @click="toggleHelp">
        <IconInfo />
      </div>
      <div
        class="info-icon reset-icon"
        @click="resetElement(props.config.id)"
        v-if="props.canReset"
      >
        <IconDebugRestart />
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <input
          v-model="props.config.value"
          type="text"
          class="vscode-input"
          @change="onChange"
          :data-config-id="props.config.id"
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
}

.field {
  margin-bottom: 0.05rem;
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

.info-icon {
  margin-left: 5px;
  padding-top: 5px;
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
