<script setup lang="ts">
import { Menu, menuType } from "../../../espIdf/menuconfig/Menu";
import { useMenuconfigStore } from "../store";
import ConfigElement from "./configElement.vue";
import SelectDropdown from "./SelectDropdown.vue";
import Checkbox from "./checkbox.vue";
import NumberInput from "./NumberInput.vue";
import StringInput from "./StringInput.vue";
import HexInput from "./HexInput.vue";
import { IconDebugRestart } from "@iconify-prerendered/vue-codicon";
import { computed } from "vue";

const props = defineProps<{
  config: Menu;
}>();
const store = useMenuconfigStore();

const canResetMenu = computed(() => store.confserverVersion >= 3);

function onChange(e: any) {
  if (props.config.type === menuType.hex) {
    props.config.value = e;
  } else if (props.config.type === "bool") {
    props.config.value = e;
  }
  store.sendNewValue(props.config);
}

function resetElement(id: string) {
  store.resetElement(id);
}

function resetElementChildren(children: string[]) {
  store.resetElementChildren(children);
}
</script>

<template>
  <div
    v-if="props.config.isVisible"
    :class="{ 'config-el': props.config.type !== 'menu' }"
  >
    <SelectDropdown
      v-if="props.config.type === 'choice'"
      :config="props.config"
      :canReset="canResetMenu"
      @change="onChange"
      @resetElement="resetElementChildren"
    />
    <Checkbox
      v-if="props.config.type === 'bool'"
      :config="props.config"
      :canReset="canResetMenu"
      @change="onChange"
      @resetElement="resetElement"
    />
    <NumberInput
      v-if="props.config.type === 'int'"
      :config="props.config"
      :canReset="canResetMenu"
      @change="onChange"
      @resetElement="resetElement"
    />
    <StringInput
      v-if="props.config.type === 'string'"
      :config="props.config"
      :canReset="canResetMenu"
      @change="onChange"
      @resetElement="resetElement"
    />
    <HexInput
      v-if="props.config.type === 'hex'"
      :config="props.config"
      :canReset="canResetMenu"
      @change="onChange"
      @resetElement="resetElement"
    />
    <div
      v-if="props.config.type === 'menu'"
      :id="props.config.id"
      class="submenu form-group"
    >
      <div class="menu-title-wrapper">
        <h4 class="menu-title" v-text="props.config.title" />
        <div
          class="reset-icon"
          @click="resetElement(props.config.id)"
          v-if="canResetMenu"
        >
          <IconDebugRestart />
        </div>
      </div>
      <Checkbox
        class="menuconfig"
        v-if="props.config.isMenuconfig"
        :config="props.config"
        :canReset="canResetMenu"
        @change="onChange"
        @resetElement="resetElement"
      />
    </div>

    <div v-if="props.config.type !== 'choice'" class="config-children">
      <ConfigElement
        v-for="child in props.config.children"
        :key="child.id"
        :config="child"
      />
    </div>
  </div>
</template>

<style scoped>
.form-group {
  padding-left: 30px;
  overflow: hidden;
}

.config-el {
  width: 90%;
}
.config-el:hover {
  background-color: var(--vscode-notifications-background);
}
.submenu {
  padding-left: 0px;
  overflow: hidden;
}
.menuconfig {
  padding-left: 0px;
}
.menu-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-title {
  font-family: var(
    --vscode-font-family,
    "Segoe WPC",
    "Segoe UI",
    Tahoma,
    Geneva,
    Verdana,
    sans-serif
  );
  font-weight: 750;
  font-size: 16px;
  color: var(--vscode-settings-headerForeground, #888888);
  margin: 0;
}

.reset-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.reset-icon:hover {
  color: var(--vscode-textLink-activeForeground);
}

.submenu:hover .reset-icon {
  opacity: 1;
}

.config-children .menu-title {
  font-size: 16px;
}

.config-children .config-children .menu-title {
  font-size: 14px;
  font-weight: 600;
}
</style>
