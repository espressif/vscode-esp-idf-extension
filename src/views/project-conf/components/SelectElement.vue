<template>
  <div class="block">
    <div class="field">
      <label class="label">{{ title }}</label>
      <div class="control">
        <div class="select">
          <select v-model="selectedValue">
            <option v-for="opt of options" :value="opt.value" :key="opt.name">{{
              opt.name
            }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="field" v-if="isCustomValue">
      <div class="control">
        <input type="text is-small" v-model="customValue" class="input" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class SelectElement extends Vue {
  @Prop() public selectValue: any;
  @Prop() public title: string;
  @Prop() public options: { name: string; value: any }[];
  @Prop() public customOption:  { name: string; value: any };
  @Prop() public customValueModel: string;
  @Prop() public updateMethod: (sections: string[], newValue: any) => void;
  @Prop() public sections: string[];
  @Prop() public customValueSections: string[];

  get isCustomValue() {
    return (
      this.selectValue &&
      this.customOption &&
      typeof this.selectValue === "string" &&
      this.selectValue.indexOf(this.customOption.value) !== -1
    );
  }

  get selectedValue() {
    return this.selectValue;
  }
  set selectedValue(newVal: any) {
    this.updateMethod(this.sections, newVal);
  }

  get customValue() {
    return this.customValueModel;
  }
  set customValue(newVal: string) {
    this.updateMethod(this.customValueSections, newVal);
  }
}
</script>
