<script setup lang="ts">
import {
  IconChevronDown,
  IconChevronUp,
  IconChevronRight,
  IconFileZip,
} from "@iconify-prerendered/vue-codicon";
import { useNewSizeStore } from "../store";
import ArchiveItemColumn from "./ArchiveItemColumn.vue";
import { IDFSizeArchive } from "../../../espIdf/size/types";

const store = useNewSizeStore();

defineProps<{
  archiveInfo: IDFSizeArchive;
  archiveName: string;
}>();

function toggleArchiveFileInfoTable(archiveName: string) {
  Object.keys(store.archives).forEach((archive) => {
    let toggleVisibility = false;
    if (archive === archiveName) {
      toggleVisibility = !store.archives[archive]["isFileInfoVisible"];
    }
    store.archives[archive]["isFileInfoVisible"] = toggleVisibility;
  });
}
</script>

<template>
  <div
    class="columns is-vcentered has-text-right is-mobile"
    v-on:click="toggleArchiveFileInfoTable(archiveName)"
    :title="archiveName"
  >
    <div class="column is-hidden-mobile">
      <div class="control">
        <span class="icon is-large">
          <IconFileZip class="is-size-4" />
        </span>
      </div>
    </div>
    <div class="column is-3 is-clipped">
      <p
        class="is-size-7-mobile is-size-6-tablet is-size-5-desktop has-text-weight-medium"
      >
        {{ archiveInfo.abbrev_name }}
      </p>
    </div>
    <ArchiveItemColumn
      v-for="(memType, propName) in archiveInfo.memory_types"
      :key="propName"
      :archiveMemoryType="memType"
      :propName="propName.toString()"
    />

    <div v-if="archiveInfo['files']" class="column">
      <div v-if="archiveInfo['isFileInfoVisible']">
        <span class="icon is-large is-hidden-mobile">
          <IconChevronDown />
        </span>
        <span class="icon is-small is-hidden-tablet">
          <IconChevronDown />
        </span>
      </div>
      <div v-else>
        <span class="icon is-large is-hidden-mobile">
          <IconChevronRight />
        </span>
        <span class="icon is-small is-hidden-tablet">
          <IconChevronRight />
        </span>
      </div>
    </div>
  </div>
</template>
