<template>
  <div class="array-element">
    <div class="field">
      <div class="control is-flex">
        <label class="label">{{ title }} </label>
      </div>
      <ul>
        <li v-for="v in values" :key="v" class="field is-grouped">
          <p class="label">{{ v }}</p>
          <div class="icon" @click="removeFromArray(v)">
            <iconify-icon icon="close" />
          </div>
        </li>
      </ul>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <input
          type="text is-small"
          v-model="elementValueToPush"
          class="input"
          @keyup.enter="addToArray"
        />
      </div>
      <div class="control">
        <div class="icon" @click="addToArray">
          <iconify-icon icon="add" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class ArrayElement extends Vue {
  @Prop() public title: string;
  @Prop() public values: string[];
  private valueToPush: string;

  get elementValueToPush() {
    return this.valueToPush;
  }
  set elementValueToPush(newVal: string) {
    this.valueToPush = newVal;
  }

  public removeFromArray(value: string) {
    const index = this.values.indexOf(value);
    this.values.splice(index, 1);
  }

  public addToArray() {
    if (!!this.valueToPush) {
      this.values.push(this.valueToPush);
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
