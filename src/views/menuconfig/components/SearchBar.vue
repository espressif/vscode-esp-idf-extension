<template>
  <div id="topbar" class="field is-grouped is-grouped-centered">
    <div class="control wide">
      <input
        v-model="search"
        type="search"
        name="search"
        placeholder="Search parameter"
        autocomplete="off"
        class="input"
      />
    </div>
    <div class="control">
      <button class="button" @click="saveConfChanges">
        {{ save }}
      </button>
    </div>
    <div class="control">
      <button class="button" @click="resetConf">
        {{ cancel }}
      </button>
    </div>
    <div class="control">
      <button class="button" @click="setDefaultConf">
        {{ reset }}
      </button>
    </div>
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
.wide {
  width: 40%;
}
</style>
