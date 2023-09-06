<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed } from "vue";
import { useSetupStore } from "../store";
let folderIcon = "folder";
const store = useSetupStore();
const props = defineProps<{
  keyEnterMethod?: () => void;
  onChangeMethod: () => void;
  openMethod: () => void;
  propLabel: string;
  propModel: string;
  propMutate: (val: string) => void;
  staticText?: string;
}>();

const dataModel = computed({
  get() {
    return props.propModel;
  },
  set(newVal: string) {
    if (props.onChangeMethod) {
      props.onChangeMethod();
    }
    props.propMutate(newVal);
  },
});

function onKeyEnter() {
  if (props.keyEnterMethod) {
    props.keyEnterMethod();
  }
}
</script>

<template>
  <div class="field">
    <label class="label">{{ propLabel }}</label>
    <div class="field has-addons align-center">
      <div class="control expanded">
        <input
          type="text"
          class="input"
          v-model="dataModel"
          @keyup.enter="onKeyEnter"
        />
      </div>
      <p class="control" v-if="staticText">
        <a class="button is-static">{{ store.pathSep + staticText }}</a>
      </p>
      <div class="control">
        <div class="icon is-large is-size-4" style="text-decoration: none;">
          <Icon
            :icon="folderIcon"
            @mouseover="folderIcon = 'folder-opened'"
            @mouseout="folderIcon = 'folder'"
            v-on:click="openMethod"
          />
        </div>
      </div>
    </div>
  </div>
</template>
