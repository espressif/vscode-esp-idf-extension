<script setup lang="ts">
import { Icon } from "@iconify/vue";
import ArchiveItemColumn from "./ArchiveItemColumn.vue";
import { useSizeStore } from "../store";

const store = useSizeStore();

const props = defineProps<{
  archiveInfo: any;
  archiveName: string;
}>();

function getArchiveProp(prop1: string, prop2: string) {
  return Object.keys(props.archiveInfo).indexOf(prop1) !== -1 ? prop1 : prop2;
}

function toggleArchiveFileInfoTable(archiveName: string) {
    Object.keys(store.archives).forEach((archive) => {
      let toggleVisibility = false;
      if (archive === archiveName) {
        toggleVisibility = !store.archives[archive]['isFileInfoVisible'];
      }
      store.archives[archive]['isFileInfoVisible'] = toggleVisibility;
    });
  }
</script>

<template>
  <div
    class="columns is-vcentered has-text-right is-mobile"
    v-on:click="toggleArchiveFileInfoTable(archiveName)"
  >
    <div class="column is-hidden-mobile">
      <div class="control">
        <span class="icon is-large">
          <Icon icon="file-zip" class="is-size-4" />
        </span>
      </div>
    </div>
    <div class="column is-3 is-clipped">
      <p
        class="is-size-7-mobile is-size-6-tablet is-size-5-desktop has-text-weight-medium"
      >
        {{ archiveName }}
      </p>
    </div>

    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      :propName="getArchiveProp('.dram0.data', 'data')"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      :propName="getArchiveProp('.dram0.bss', 'bss')"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      :propName="getArchiveProp('.iram0.text', 'iram')"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      :propName="getArchiveProp('.flash.text', 'flash_text')"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      :propName="getArchiveProp('.flash.rodata', 'flash_rodata')"
    />

    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      propName="ram_st_total"
      v-if="archiveInfo['ram_st_total']"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      propName="flash_total"
      v-if="archiveInfo['flash_total']"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      propName="total"
      v-if="archiveInfo['total']"
    />

    <div v-if="archiveInfo['files']" class="column">
      <div v-if="!archiveInfo['isFileInfoVisible']">
        <span class="icon is-large is-hidden-mobile">
          <Icon icon="chevron-down" />
        </span>
        <span class="icon is-small is-hidden-tablet">
          <Icon icon="chevron-down" />
        </span>
      </div>
      <div v-else>
        <span class="icon is-large is-hidden-mobile">
          <Icon icon="chevron-up" />
        </span>
        <span class="icon is-small is-hidden-tablet">
          <Icon icon="chevron-up" />
        </span>
      </div>
    </div>
  </div>
</template>
