<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  selectValue: any;
  title: string;
  options: { name: string; value: any }[];
  customOption: { name: string; value: any };
  customValueModel: string;
  updateMethod: (sections: string[], newValue: any) => void;
  sections: string[];
  customValueSections: string[];
}>();

let isCustomValue = computed(() => {
  return (
    props.selectValue &&
    props.customOption &&
    typeof props.selectValue === "string" &&
    props.selectValue.indexOf(props.customOption.value) !== -1
  );
});

let selectedValue = computed({
  get() {
    return props.selectValue;
  },
  set(newVal: any) {
    props.updateMethod(this.sections, newVal);
  }
});

let customValue = computed({
  get() {
    return props.customValueModel;
  },
  set(newVal: string) {
    props.updateMethod(this.customValueSections, newVal);
  }
});
</script>

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
