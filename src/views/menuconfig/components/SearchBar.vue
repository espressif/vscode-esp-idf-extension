<template>
  <div id="topbar">
    <form>
      <input
        v-model="search"
        type="search"
        name="search"
        placeholder="Search parameter"
        autocomplete="off"
        class="form-control"
      />
    </form>
    <button class="button-vscode" @click="saveConfChanges">
      {{ save }}
    </button>
    <button class="button-vscode" @click="resetConf">
      {{ cancel }}
    </button>
    <button class="button-vscode" @click="setDefaultConf">
      {{ reset }}
    </button>
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
  display: flex;
  align-self: center;
}
form {
  display: flex;
  align-self: center;
}
.form-control {
  color: var(--vscode-settings-textInputForeground);
  background-color: var(--vscode-settings-textInputBackground);
  border: 0px;
  outline: 0.5px solid var(--vscode-settings-textInputBorder);
  padding-left: 1%;
}
input[type="search"].form-control {
  width: 60vh;
  height: 3vh;
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
  margin: 1%;
  width: 15vh;
  height: 3vh;
  align-self: center;
}
.button-vscode:hover {
  background: var(--vscode-button-hoverBackground);
}
</style>
