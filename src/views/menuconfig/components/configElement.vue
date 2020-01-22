<template>
  <div v-if="config.isVisible">
    <div
      v-if="config.type === 'choice'"
      class="form-group"
    >
      <label
        class="inline-block"
        v-text="config.title"
      />
      <font-awesome-icon
        icon="info-circle"
        class="info-icon"
        @click="toggleHelp"
      />
      <br>
      <select
        v-model="config.value"
        class="form-control"
        @change="onChange"
      >
        <option
          v-for="option in config.children"
          :key="option.id"
          :value="option.id"
        >
          {{ option.title }}
        </option>
      </select>
    </div>
    <div
      v-if="config.type === 'bool'"
      class="form-group"
    >
      <div class="switch_box">
        <input
          id="config.id"
          v-model="config.value"
          type="checkbox"
          class="switch_1"
          @change="onChange"
        >
        <label
          for="config.id"
          style="display: block"
          v-text="config.title"
        />
        <font-awesome-icon
          icon="info-circle"
          class="info-icon"
          @click="toggleHelp"
        />
        <br> <br>
      </div>
    </div>
    <div
      v-if="config.type === 'int'"
      class="form-group"
    >
      <label
        class="inline-block"
        v-text="config.title"
      />
      <font-awesome-icon
        icon="info-circle"
        class="info-icon"
        @click="toggleHelp"
      />
      <br>
      <input
        v-model="config.value"
        type="number"
        class="form-control inline-block"
        placeholder="0"
        @change="onChange"
      >
    </div>
    <div
      v-if="config.type === 'string'"
      class="form-group"
    >
      <label
        class="inline-block"
        v-text="config.title"
      />
      <font-awesome-icon
        icon="info-circle"
        class="info-icon"
        @click="toggleHelp"
      />
      <br>
      <input
        v-model="config.value"
        type="text"
        class="form-control inline-block"
        @change="onChange"
      >
    </div>
    <div
      v-if="config.type === 'hex'"
      class="form-group"
    >
      <label
        class="inline-block"
        v-text="config.title"
      />
      <font-awesome-icon
        icon="info-circle"
        class="info-icon"
        @click="toggleHelp"
      />
      <br>
      <the-mask
        :value="config.value"
        mask="0xWWWWWWWWWW"
        :masked="false"
        :tokens="{ W: { pattern: /[0-9a-fA-F]/, transform: (v) => v.toLocaleUpperCase() } }"
        class="form-control inline-block"
        @change.native="onChange"
      />
    </div>
    <div
      v-if="config.type === 'menu'"
      :id="config.id"
      class="submenu form-group"
    >
      <h4
        class="menu-title"
        v-text="config.title"
      />
      <div
        v-if="config.isMenuconfig"
        class="switch_box menuconfig"
      >
        <input
          :id="config.id"
          v-model="config.value"
          type="checkbox"
          class="switch_1"
          @change="onChange"
        >
        <label
          :for="config.id"
          style="display: block"
          v-text="config.title"
        />
        <font-awesome-icon
          icon="info-circle"
          class="info-icon"
          @click="toggleHelp"
        />
        <br> <br>
      </div>
    </div>

    <div
      v-show="isHelpVisible"
      class="content"
      v-html="config.help"
    />

    <div
      v-if="config.type !== 'choice'"
    >
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
        color: var(--vscode-editor-foreground);
        position: inherit;
        width: 15px;
        height: 15px;
        margin-left: 5px;
        top: 50%;
    }
    .form-group {
        padding-left: 30px;
        overflow: hidden;
    }
    .form-control {
        color: var(--vscode-settings-textInputForeground);
        background-color: var(--vscode-settings-textInputBackground);
        border: 0px;
        outline: 0.5px solid var(--vscode-settings-textInputBorder);
        padding: 0.5%;
        margin-top: 1%;
        margin-bottom: 1%;
    }
    .form-control:focus {
        box-shadow: 0 0 .25em var(--vscode-settings-textInputForeground);
        outline: 2px solid var(--vscode-settings-textInputForeground);
    }
    .form-control:hover {
        box-shadow: 0 0 .25em var(--vscode-settings-textInputForeground);
    }
    .inline-block {
        display: inline-block;
    }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        /* display: none; <- Crashes Chrome on hover */
        -webkit-appearance: none;
        margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
    }
    .content {
        padding: 0 18px;
        overflow: hidden;
        transition: max-height 0.2s ease-out;
        margin: 10px;
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
        border: 0;
        border-radius: 3px;
        cursor: pointer;
        margin-right: 1%;
        outline: none;
        position: relative;
        color: var(--vscode-settings-checkboxForeground);
        background-color: var(--vscode-settings-checkboxBackground);
        box-shadow: 0 0 .15em var(--vscode-settings-textInputForeground);
    }
    .switch_1:checked::before
    {
        position: absolute;
        left: 15%;
        content: '\2713';
        font-size: 15px;
    }
    .switch_1:hover
    {
        box-shadow: 0 0 .25em var(--vscode-settings-textInputForeground);
    }
    .submenu {
        padding-left: 0px;
        padding-right: 10px;
        overflow: hidden;
    }
    .menuconfig {
        padding-left: 0px;
    }
    .menu-title {
        display: inline-block;
    }
</style>
