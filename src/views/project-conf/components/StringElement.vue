<template>
  <div class="project-element">
    <div class="field">
      <div class="control is-flex">
        <label :for="value" class="label">{{ title }} </label>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <input type="text is-small" v-model="stringValue" class="input" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class CMakeListElement extends Vue {
  @Prop() public title: string;
  @Prop() public value: string;
  @Prop() public updateMethod: (sections: string[], newValue: any) => void;
  @Prop() public sections: string[];

  get stringValue() {
    return this.value;
  }
  set stringValue(newVal: any) {
    this.updateMethod(this.sections, newVal);
  }
}
</script>
