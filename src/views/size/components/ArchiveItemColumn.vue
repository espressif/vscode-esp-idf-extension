<template>
  <div class="column">
    <p class="is-size-7-mobile is-size-6-tablet is-size-5-desktop">
      {{
        archiveInfo[propName]
          ? convertToKB(archiveInfo[propName])
          : convertToKB(0)
      }}<span class="has-text-weight-light is-uppercase">kb</span>
    </p>
    <p class="heading">{{ propName }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class ArchiveItemColumn extends Vue {
  @Prop() archiveInfo;
  @Prop() propName: string;

  convertToKB(byte: number) {
    return typeof byte === "number" ? Math.round(byte / 1024) : 0;
  }
}
</script>
