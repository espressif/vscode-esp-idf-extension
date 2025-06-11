<script setup lang="ts">
import { Menu, menuType } from "../../../espIdf/menuconfig/Menu";
import { useMenuconfigStore } from "../store";
import ConfigElement from "./configElement.vue";
import { IconInfo } from "@iconify-prerendered/vue-codicon";
import { Ref, ref } from "vue";
import { vMaska } from "maska";
import SelectDropdown from "./SelectDropdown.vue";
import Checkbox from "./checkbox.vue";

const props = defineProps<{
  config: Menu;
}>();

let isHelpVisible: Ref<boolean> = ref(false);

function toggleHelp() {
  isHelpVisible.value = !isHelpVisible.value;
}
const store = useMenuconfigStore();

function onChange(e) {
  if (props.config.type === menuType.hex) {
    props.config.value = e.target.value;
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
    <div v-if="props.config.type === 'int'" class="form-group">
      <div class="field has-addons">
        <label v-text="props.config.title" />
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
            class="input is-small"
            placeholder="0"
            @change="onChange"
            @wheel.prevent
          />
        </div>
      </div>
    </div>
    <div v-if="props.config.type === 'string'" class="form-group">
      <div class="field has-addons">
        <label v-text="props.config.title" :data-config-id="props.config.id" />
        <div class="info-icon" @click="toggleHelp">
          <IconInfo />
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <input
            v-model="props.config.value"
            type="text"
            class="input is-small"
            @change="onChange"
          />
        </div>
      </div>
    </div>
    <div v-if="props.config.type === 'hex'" class="form-group">
      <div class="field has-addons">
        <label v-text="props.config.title" />
        <div class="control">
          <div class="info-icon" @click="toggleHelp">
            <IconInfo />
          </div>
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <input
            v-maska
            v-model="props.config.value"
            data-maska="0xWWWWWWWWWW"
            data-maska-tokens="W:[0-9a-fA-F]"
            class="input is-small"
            @change.native="onChange"
            :data-config-id="props.config.id"
          />
        </div>
      </div>
    </div>
    <div
      v-if="props.config.type === 'menu'"
      :id="props.config.id"
      class="submenu form-group"
    >
      <h4 class="subtitle" v-text="props.config.title" />
      <Checkbox
        class="menuconfig"
        v-if="props.config.isMenuconfig"
        :config="props.config"
        @change="onChange"
      />
    </div>

    <p v-show="isHelpVisible" class="help-kconfig-title">
      KCONFIG Name:
      <label style="font-weight: 900;">{{ props.config.name }}</label>
    </p>
    <div v-show="isHelpVisible" class="content" v-html="props.config.help" />

    <div v-if="props.config.type !== 'choice'">
      <ConfigElement
        v-for="child in props.config.children"
        :key="child.id"
        :config="child"
      />
    </div>
  </div>
</template>

<style scoped>
.info-icon {
  margin-left: 5px;
}
.form-group {
  padding-left: 30px;
  overflow: hidden;
  margin-bottom: 0.5em;
}
.config-el:hover {
  background-color: var(--vscode-notifications-background);
}
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}
.content {
  padding: 0 18px;
  overflow: hidden;
  transition: max-height 0.2s ease-out;
  margin: 10px;
}
.input {
  width: 30rem;
}
.input,
.select {
  border-color: var(--vscode-input-background);
}
.submenu {
  padding-left: 0px;
  overflow: hidden;
  margin-bottom: 0.25em;
}
.menuconfig {
  padding-left: 0px;
}
.help-kconfig-title {
  padding: 0 18px;
  margin-left: 10px;
}
</style>
