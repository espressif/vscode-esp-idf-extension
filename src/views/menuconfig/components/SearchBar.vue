<template>
  <div id="topbar">
    <button
      class="button-vscode"
      @click="saveConfChanges"
    >
      {{save}}
    </button>
    <button
      class="button-vscode"
      @click="resetConf"
    >
      {{cancel}}
    </button>
    <button
      class="button-vscode"
      @click="setDefaultConf"
    >
      {{reset}}
    </button>
    <form>
      <input
        v-model="search"
        type="search"
        name="search"
        placeholder="Search parameter"
        autocomplete="off"
        class="form-control"
      >
    </form>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { Menu } from "../../../espIdf/menuconfig/Menu";

@Component
export default class SearchBar extends Vue {
  @Action("saveGuiConfig") public saveConfChanges;
  @Action("resetGuiConfig") public resetConf;
  @Action("setDefaultConfig") public setDefaultConf;
  @Mutation("setSearchString") private updateSearchString;
  @State("searchString") private storeSearchString!: string;
  @State("textDictionary") private storeTextDictionary;

  get search() {
    return this.storeSearchString;
  }
  set search(value) {
    this.updateSearchString(value);
  }
  get save() {
    return this.storeTextDictionary.save;
  }
  get cancel() {
    return this.storeTextDictionary.discard;
  }
  get reset() {
    return this.storeTextDictionary.reset;
  }
}
</script>

<style scoped>
    #topbar {
        background-color: var(--vscode-editor-background);
        margin-top: 0.5%;
        text-align: center;
        width: 65%;
    }
    .form-control {
        color: var(--vscode-settings-textInputForeground);
        background-color: var(--vscode-settings-textInputBackground);
        border: 0px;
        outline: 0.5px solid var(--vscode-settings-textInputBorder);
        padding-top: 1%;
        padding-left: 1%;
        padding-bottom: 1%;
        margin-top: 1%;
        margin-bottom: 1%;
    }
    input[type="search"].form-control {
        padding: 5%;
        width: 365%;
        margin-left: 2%;
    }
    form {
        display: inline-block;
    }
    .button-vscode {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        font-weight: bold;
        border: 0px;
        border-radius: 1%;
        padding: 1%;
        margin-top: 1%;
        margin-bottom: 1%;
        display: inline-block;
    }
    .button-vscode:hover {
        background: var(--vscode-button-hoverBackground);
    }
</style>
