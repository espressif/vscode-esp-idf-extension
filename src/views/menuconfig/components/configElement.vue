<template>
  <div v-if="config.isVisible" :class="{ 'config-el': config.type !== 'menu' }">
    <div v-if="config.type === 'choice'" class="form-group">
      <div class="field">
        <div class="field has-addons">
          <label v-text="config.title" />
          <div class="control">
            <div class="info-icon" @click="toggleHelp">
              <iconify-icon icon="info" />
            </div>
          </div>
        </div>
        <div class="field">
          <div class="control">
            <select v-model="config.value" class="select" @change="onChange">
              <option
                v-for="option in config.children"
                :key="option.id"
                :value="option.id"
              >
                {{ option.title }}
              </option>
            </select>
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
          @change="onChange"
        />
        <div class="field has-addons">
          <label :for="config.id" v-text="config.title" />
          <div class="control">
            <div class="info-icon" @click="toggleHelp">
              <iconify-icon icon="info" />
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
            <iconify-icon icon="info" />
          </div>
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <input
            v-model="config.value"
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
        <label v-text="config.title" />
        <div class="info-icon" @click="toggleHelp">
          <iconify-icon icon="info" />
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
            <iconify-icon icon="info" />
          </div>
        </div>
      </div>
      <div class="field is-grouped">
        <div class="control">
          <the-mask
            :value="config.value"
            mask="0xWWWWWWWWWW"
            :masked="false"
            :tokens="{
              W: {
                pattern: /[0-9a-fA-F]/,
                transform: (v) => v.toLocaleUpperCase(),
              },
            }"
            class="input is-small"
            @change.native="onChange"
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
              <iconify-icon icon="info" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="isHelpVisible" class="content" v-html="config.help" />

    <div v-if="config.type !== 'choice'">
      <config-el
        v-for="child in config.children"
        :key="child.id"
        :config="child"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { Menu, menuType } from "../../../espIdf/menuconfig/Menu";

@Component
export default class ConfigElement extends Vue {
  @Prop() public config: Menu;
  @Action("sendNewValue") public actionSendValue;
  private isHelpVisible: boolean = false;

  public toggleHelp() {
    this.isHelpVisible = !this.isHelpVisible;
  }

  public onChange(e) {
    if (this.config.type === menuType.hex) {
      this.config.value = e.target.value;
    }
    this.actionSendValue(this.config);
  }
}
</script>

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
