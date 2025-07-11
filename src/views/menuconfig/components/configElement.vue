<script setup lang="ts">
import { Menu, menuType } from "../../../espIdf/menuconfig/Menu";
import { useMenuconfigStore } from "../store";
import ConfigElement from "./configElement.vue";
import SelectDropdown from "./SelectDropdown.vue";
import Checkbox from "./checkbox.vue";
import NumberInput from "./NumberInput.vue";
import StringInput from "./StringInput.vue";
import HexInput from "./HexInput.vue";

const props = defineProps<{
  config: Menu;
}>();
const store = useMenuconfigStore();

function onChange(e) {
  if (props.config.type === menuType.hex) {
    props.config.value = e;
  } else if (props.config.type === "bool") {
    props.config.value = e;
  }
  store.sendNewValue(props.config);
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
      @change="onChange"
    />
    <Checkbox
      v-if="props.config.type === 'bool'"
      :config="props.config"
      @change="onChange"
    />
    <NumberInput
      v-if="props.config.type === 'int'"
      :config="props.config"
      @change="onChange"
    />
    <StringInput
      v-if="props.config.type === 'string'"
      :config="props.config"
      @change="onChange"
    />
    <HexInput
      v-if="props.config.type === 'hex'"
      :config="props.config"
      @change="onChange"
    />
    <div
      v-if="props.config.type === 'menu'"
      :id="props.config.id"
      class="submenu form-group"
    >
      <h4 class="menu-title" v-text="props.config.title" />
      <Checkbox
        class="menuconfig"
        v-if="props.config.isMenuconfig"
        :config="props.config"
        @change="onChange"
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
  margin-top: 9px;
  margin-bottom: 9px;
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
  padding: 10px 10px 10px 15px;
}
.menuconfig {
  padding-left: 0px;
}
.menu-title {
  font-family: var(--vscode-font-family, "Segoe WPC", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif);
  font-weight: 750;
  font-size: 26px;
  color: var(--vscode-settings-headerForeground, #888888);
}

.config-children .menu-title {
  font-size: 22px;
}

.config-children .config-children .menu-title {
  font-size: 18px;
}
</style>
