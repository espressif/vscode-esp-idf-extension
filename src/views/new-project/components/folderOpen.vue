<script setup lang="ts">
import { Icon } from "@iconify/vue";
let folderIcon = "folder";

const props = defineProps<{
  keyEnterMethod?: () => void;
  openMethod: () => void;
  propLabel: string;
  propModel: string;
  staticText: string;
}>();

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
          v-model="propModel"
          @keyup.enter="onKeyEnter"
        />
      </div>
      <div class="control" v-if="staticText">
        <a class="button is-static">{{ pathSep + staticText }}</a>
      </div>
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
