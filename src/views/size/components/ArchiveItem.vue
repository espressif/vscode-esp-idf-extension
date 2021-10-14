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

    <div class="column" v-for="(value, key) in archiveInfo" :key="key">
      <p class="is-size-7-mobile is-size-6-tablet is-size-5-desktop">
        {{ convertToKB(value)
        }}<span class="has-text-weight-light is-uppercase">kb</span>
      </p>
      <p class="heading">{{ key }}</p>
    </div>

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
import { isNumber } from "util";
import { Component, Prop, Vue } from "vue-property-decorator";
import { State } from "vuex-class";

@Component
export default class ArchiveItem extends Vue {
  @Prop() archiveInfo;
  @Prop() archiveName: string;
  @State("archives") storeArchives;

  convertToKB(byte: number) {
    return isNumber(byte) ? Math.round(byte / 1024) : 0;
  }

  toggleArchiveFileInfoTable(archiveName: string) {
    Object.keys(this.storeArchives).forEach((archive) => {
      let toggleVisibility = false;
      if (archive === archiveName) {
        toggleVisibility = !this.storeArchives[archive].isFileInfoVisible;
      }
      this.$set(this.storeArchives[archive], "isFileInfoVisible", toggleVisibility);
    });
  }
}
</script>
