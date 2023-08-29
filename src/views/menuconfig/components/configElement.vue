<script setup lang="ts">
import { Menu, menuType } from "../../../espIdf/menuconfig/Menu";
import { useMenuconfigStore } from "../store";
import { Icon } from "@iconify/vue";
import ConfigElement from "./configElement.vue";
import { vMaska } from "maska";

const props = defineProps<{
  config: Menu;
}>();

let isHelpVisible: boolean = false;

function toggleHelp() {
  isHelpVisible = !isHelpVisible;
}

function onChange(e) {
  const store = useMenuconfigStore();
  if (props.config.type === menuType.hex) {
    props.config.value = e.target.value;
  }
  store.sendNewValue(props.config);
}
</script>

<template>
  <div v-if="config.isVisible" :class="{ 'config-el': config.type !== 'menu' }">
    <div v-if="config.type === 'choice'" class="form-group">
      <div class="field">
        <div class="field has-addons">
          <label v-text="config.title" />
          <div class="control">
            <div class="info-icon" @click="toggleHelp">
              <Icon icon="info" />
            </div>
          </div>
        </div>
        <div class="field">
          <div class="control">
            <div class="select is-small">
              <select
                v-model="config.value"
                @change="onChange"
                :data-config-id="config.id"
              >
                <option
                  v-for="option in config.children"
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
    </div>
    <div v-if="config.type === 'bool'" class="form-group">
      <div class="switch_box">
        <input
          id="config.id"
          v-model="config.value"
          type="checkbox"
          class="switch_1"
          :data-config-id="config.id"
          @change="onChange"
        />
        <div class="field has-addons">
          <label :for="config.id" v-text="config.title" />
          <div class="control">
            <div class="info-icon" @click="toggleHelp">
              <Icon icon="info" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="config.type === 'int'" class="form-group">
      <div class="field has-addons">
        <label v-text="config.title" />
        <div class="control">
          <div class="info-icon" @click="toggleHelp">
            <Icon icon="info" />
          </div>
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <input
            v-model="config.value"
            :data-config-id="config.id"
            type="number"
            class="input is-small"
            placeholder="0"
            @change="onChange"
          />
        </div>
      </div>
    </div>
    <div v-if="config.type === 'string'" class="form-group">
      <div class="field has-addons">
        <label v-text="config.title" :data-config-id="config.id" />
        <div class="info-icon" @click="toggleHelp">
          <Icon icon="info" />
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <input
            v-model="config.value"
            type="text"
            class="input is-small"
            @change="onChange"
          />
        </div>
      </div>
    </div>
    <div v-if="config.type === 'hex'" class="form-group">
      <div class="field has-addons">
        <label v-text="config.title" />
        <div class="control">
          <div class="info-icon" @click="toggleHelp">
            <Icon icon="info" />
          </div>
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <input
            v-model="config.value"
            data-maska="0xWWWWWWWWWW"
            data-maska-tokens="W:[0-9a-fA-F]"
            class="input is-small"
            @change.native="onChange"
            :data-config-id="config.id"
          />

          <input
            v-model="config.value"
            v-maska
            data-maska="!0xHHHHHH"
            data-maska-tokens="H:[0-9a-fA-F]"
          />
        </div>
      </div>
    </div>
    <div
      v-if="config.type === 'menu'"
      :id="config.id"
      class="submenu form-group"
    >
      <h4 class="subtitle" v-text="config.title" />
      <div v-if="config.isMenuconfig" class="switch_box menuconfig">
        <div class="control">
          <input
            :id="config.id"
            v-model="config.value"
            type="checkbox"
            class="switch_1"
            @change="onChange"
          />
        </div>
        <div class="field has-addons">
          <label :for="config.id" v-text="config.title" />
          <div class="control">
            <div class="info-icon" @click="toggleHelp">
              <Icon icon="info" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="isHelpVisible" class="content" v-html="config.help" />

    <div v-if="config.type !== 'choice'">
      <ConfigElement
        v-for="child in config.children"
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
.switch_box {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-pack: center;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-flex: 1;
  flex: 1;
}
.switch_1 {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  height: 18px;
  width: 18px;
  border-color: var(--vscode-input-border);
  border-radius: 3px;
  cursor: pointer;
  margin-right: 1%;
  outline: none;
  position: relative;
  color: var(--vscode-settings-checkboxForeground);
  background-color: var(--vscode-settings-checkboxBackground);
}
.switch_1:checked::before {
  position: absolute;
  left: 15%;
  content: "\2713";
  font-size: 15px;
}
.switch_1:hover {
  border-color: var(--vscode-inputOption-activeBorder);
}
.submenu {
  padding-left: 0px;
  overflow: hidden;
  margin-bottom: 0.25em;
}
.menuconfig {
  padding-left: 0px;
}
.menu-title {
  display: inline-block;
}
</style>
