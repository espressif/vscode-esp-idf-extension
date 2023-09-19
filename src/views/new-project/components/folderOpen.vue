<script setup lang="ts">
import { IconFolder, IconFolderOpened } from "@iconify-prerendered/vue-codicon";
import { computed, ref } from "vue";
let folderIcon = ref("folder");

const props = defineProps<{
  keyEnterMethod?: () => void;
  openMethod: () => void;
  propLabel: string;
  propModel: string;
  propMutate: (val: string) => void;
  staticText: string;
}>();

const dataModel = computed({
  get() {
    return props.propModel;
  },
  set(newVal: string) {
    props.propMutate(newVal);
  },
});

const pathSep = navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
function onKeyEnter() {
  if (props.keyEnterMethod) {
    props.keyEnterMethod();
  }
}
</script>

<template>
  <div class="field text-size">
    <label class="label">{{ propLabel }}</label>
    <div class="field expanded has-addons">
      <div class="control expanded">
        <input
          type="text"
          class="input"
          v-model="dataModel"
          @keyup.enter="onKeyEnter"
        />
      </div>
      <div class="control" v-if="staticText">
        <a class="button is-static">{{ pathSep + staticText }}</a>
      </div>
      <div
        class="control"
        @mouseover="folderIcon = 'folder-opened'"
        @mouseout="folderIcon = 'folder'"
      >
        <div
          class="icon is-large is-size-4"
          style="text-decoration: none;"
          v-on:click="openMethod"
        >
          <IconFolderOpened v-if="(folderIcon === 'folder-opened')" />
          <IconFolder v-if="(folderIcon === 'folder')" />
        </div>
      </div>
    </div>
  </div>
</template>
