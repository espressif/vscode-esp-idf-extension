<template>
  <div class="block">
    <div class="field">
      <div class="control is-flex">
        <label class="subtitle has-text-weight-bold">{{ title }} </label>
      </div>
      <ul class="tags">
        <li v-for="v in values" :key="v" class="tag is-custom-tag">
          <p>{{ v }}</p>
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
          v-model="valueToPush"
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
  @Prop() public addValue: (sections: string[], val: string) => void;
  @Prop() public removeValue: (sections: string[], i: number) => void;
  @Prop() public sections: string[];
  private valueToPush: string = "";

  public removeFromArray(val: any) {
    const index = this.values.indexOf(val);
    // this.values.splice(index, 1);
    this.removeValue(this.sections, index);
  }

  public addToArray() {
    if (this.valueToPush !== "") {
      this.addValue(this.sections, this.valueToPush);
      // this.values.push(this.valueToPush);
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

.is-custom-tag {
  background-color: var(--vscode-foreground);
  color: var(--vscode-editor-background);
}
</style>
