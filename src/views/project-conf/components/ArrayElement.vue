<template>
  <div>
    <div class="field">
      <div class="control is-flex">
        <label :for="el.id" class="label">{{ el.title }} </label>
        <a class="delete" @click="del"></a>
      </div>
      <ul>
        <li v-for="v in el.value" :key="v" class="field is-grouped">
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
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import { CmakeListsElement } from "../../../cmake/cmakeListsElement";

@Component
export default class CMakeListsArrayElement extends Vue {
  @Prop() public el: CmakeListsElement;
  private valueToPush: string;

  get elementValueToPush() {
    return this.valueToPush;
  }
  set elementValueToPush(newVal: string) {
    this.valueToPush = newVal;
  }

  public removeFromArray(value) {
    const index = this.el.value.indexOf(value);
    this.el.value.splice(index, 1);
  }

  public addToArray() {
    if (!!this.valueToPush) {
      this.el.value.push(this.valueToPush);
      this.valueToPush = "";
    }
  }

  @Emit("delete")
  del() {}
}
</script>

<style scoped>
.is-grouped {
  align-items: center;
}
li.is-grouped .icon {
  margin-bottom: 0.5em;
}
</style>
