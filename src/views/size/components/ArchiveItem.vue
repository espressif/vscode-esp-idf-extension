<template>
  <div
    class="columns is-vcentered has-text-right is-mobile"
    v-on:click="toggleArchiveFileInfoTable(archiveName)"
  >
    <div class="column is-hidden-mobile">
      <div class="control">
        <span class="icon is-large">
          <iconify-icon icon="file-zip" class="is-size-4" />
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
      v-if="archiveInfo.ram_st_total"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      propName="flash_total"
      v-if="archiveInfo.flash_total"
    />
    <ArchiveItemColumn
      :archiveInfo="archiveInfo"
      propName="total"
      v-if="archiveInfo.total"
    />

    <div v-if="archiveInfo.files" class="column">
      <div v-if="!archiveInfo.isFileInfoVisible">
        <span class="icon is-large is-hidden-mobile">
          <iconify-icon icon="chevron-down" />
        </span>
        <span class="icon is-small is-hidden-tablet">
          <iconify-icon icon="chevron-down" />
        </span>
      </div>
      <div v-else>
        <span class="icon is-large is-hidden-mobile">
          <iconify-icon icon="chevron-up" />
        </span>
        <span class="icon is-small is-hidden-tablet">
          <iconify-icon icon="chevron-up" />
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import ArchiveItemColumn from "./ArchiveItemColumn.vue";

@Component({
  components: {
    ArchiveItemColumn,
  },
})
export default class ArchiveItem extends Vue {
  @Prop() archiveInfo;
  @Prop() archiveName: string;
  @State("archives") storeArchives;

  toggleArchiveFileInfoTable(archiveName: string) {
    Object.keys(this.storeArchives).forEach((archive) => {
      let toggleVisibility = false;
      if (archive === archiveName) {
        toggleVisibility = !this.storeArchives[archive].isFileInfoVisible;
      }
      this.$set(
        this.storeArchives[archive],
        "isFileInfoVisible",
        toggleVisibility
      );
    });
  }

  getArchiveProp(prop1: string, prop2: string) {
    return Object.keys(this.archiveInfo).indexOf(prop1) !== -1 ? prop1 : prop2;
  }
}
</script>
