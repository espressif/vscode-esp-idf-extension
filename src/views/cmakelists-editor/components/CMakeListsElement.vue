<template>
  <div class="cmake-element">
    <div class="field">
      <div class="control">
        <label :for="el.id" class="label">{{ el.title }} </label>
      </div>
      <ul v-if="el.type === 'array'">
        <li v-for="v in el.value" :key="v" class="field has-addons">
          <p class="label">{{ v }}</p>
          <div class="icon" @click="removeFromArray(v)">
            <i class="codicon codicon-close"></i>
          </div>
        </li>
      </ul>
    </div>
    <div v-if="el.type === 'array'" class="field has-addons">
      <div class="control">
        <input type="text" v-model="elementValueToPush" class="input" />
      </div>
      <div class="control">
        <div class="icon" @click="addToArray">
          <i class="codicon codicon-add"></i>
        </div>
      </div>
    </div>
    <div v-else class="field">
      <div class="control">
        <input type="text" v-model="el.value" class="input" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { CmakeListsElement } from "../../../cmake/CmakeListsElement";

@Component
export default class CMakeListElement extends Vue {
  @Prop() public el: CmakeListsElement;
  @State("textDictionary") private storeTextDictionary;
  private valueToPush: string;

  get elementValueToPush() {
    return this.valueToPush;
  }
  set elementValueToPush(newVal: string) {
    this.valueToPush = newVal;
  }

  get saveText() {
    return this.storeTextDictionary.save;
  }
  get cancelText() {
    return this.storeTextDictionary.discard;
  }

  public removeFromArray(value) {
    const index = this.el.value.indexOf(value);
    this.el.value.splice(index, 1);
  }

  public addToArray() {
    this.el.value.push(this.valueToPush);
    this.valueToPush = "";
  }
}
</script>

<style scoped>
.icon:hover {
  background-color: var(--vscode-button-background);
}
</style>
