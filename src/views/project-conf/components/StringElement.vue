<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  title: string;
  value: string;
  updateMethod: (sections: string[], newValue: any) => void;
  sections: string[];
  openMethod: (sections: string[]) => void;
}>();
let folderIcon = "folder";

let stringValue = computed({
  get() {
    return props.value;
  },
  set(newVal: any) {
    props.updateMethod(props.sections, newVal);
  },
});
</script>

<template>
  <div class="block">
    <div class="field">
      <div class="control is-flex">
        <label :for="value" class="label">{{ title }} </label>
      </div>
    </div>
    <div class="field has-addons">
      <div class="control expanded">
        <input type="text is-small" v-model="stringValue" class="input" />
      </div>
      <div class="control" v-if="openMethod">
        <div class="icon is-large is-size-4" style="text-decoration: none;">
          <Icon
            :icon="folderIcon"
            @mouseover="folderIcon = 'folder-opened'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openMethod(sections)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expanded {
  width: 70%;
  align-items: center;
  display: flex;
  justify-content: center;
}
</style>
