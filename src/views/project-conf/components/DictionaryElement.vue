<template>
  <div class="block">
    <div class="field">
      <div class="control is-flex">
        <label class="label">{{ title }} </label>
      </div>
      <ul class="small-margin">
        <li
          v-for="confKey in Object.keys(elements)"
          :key="confKey"
          class="field is-grouped"
        >
          <div class="control is-flex">
            <label :for="elements[confKey]" class="label">{{ confKey }} :</label>
          </div>
          <div class="control">
            <input
              type="text is-small"
              v-model="elements[confKey]"
              class="input"
            />
          </div>
          <div class="icon" @click="removeElement(confKey)">
            <iconify-icon icon="close" />
          </div>
        </li>
      </ul>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <input
          type="text is-small"
          v-model="keyToAdd"
          class="input"
          @keyup.enter="addToDictionary"
          placeholder="enter key name"
        />
      </div>
      <div class="control">
        <div class="icon" @click="addToDictionary">
          <iconify-icon icon="add" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class DictionaryElement extends Vue {
  @Prop() public title: string;
  @Prop() public elements: { [key: string]: string };
  private valueToPush: string = "";

  get keyToAdd() {
    return this.valueToPush;
  }
  set keyToAdd(newVal: string) {
    this.valueToPush = newVal;
  }

  public removeElement(dictKey: string) {
    this.$delete(this.elements, dictKey);
  }

  public addToDictionary() {
    if (this.valueToPush != "") {
      this.elements[this.valueToPush] = "";
      this.valueToPush = "";
    }
  }
}
</script>

<style scoped>
.is-grouped {
  align-items: center;
}
li.is-grouped .icon {
  margin-bottom: 0.5em;
}
.icon:hover {
  background-color: var(--vscode-button-background);
}
</style>
