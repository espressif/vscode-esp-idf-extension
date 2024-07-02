<script setup lang="ts">
import { IconFolder, IconFolderOpened } from "@iconify-prerendered/vue-codicon";
import { computed } from "vue";
import { defineProps, defineEmits } from "vue";
import { useSetupStore } from "../store";

let folderIcon = "folder";
const props = defineProps<{
  keyEnterMethod?: () => void;
  onChangeMethod?: () => void;
  openMethod: () => Promise<string | undefined>;
  propLabel: string;
  propModel: string;
  propMutate: (val: string) => void;
  staticText?: string;
}>();

const store = useSetupStore();
const emit = defineEmits(["blur"]);

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

async function selectFolder() {
  const folder = await props.openMethod();
  if (folder !== undefined) {
    props.propMutate(folder);
    emit("blur", folder);
    if (props.onChangeMethod) {
      props.onChangeMethod();
    }
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
          @blur="$emit('blur', dataModel)"
          @keyup.enter="onKeyEnter"
        />
      </div>
      <p class="control" v-if="staticText">
        <a class="button is-static">{{ store.pathSep + staticText }}</a>
      </p>
      <div class="control">
        <div
          class="icon is-large is-size-4"
          style="text-decoration: none;"
          @mouseover="folderIcon = 'folder-opened'"
          @mouseout="folderIcon = 'folder'"
          @click="selectFolder"
        >
          <IconFolderOpened v-if="folderIcon === 'folder-opened'" />
          <IconFolder v-if="folderIcon === 'folder'" />
        </div>
      </div>
    </div>
  </div>
</template>
