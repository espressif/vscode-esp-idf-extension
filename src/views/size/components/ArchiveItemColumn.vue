<script setup lang="ts">
defineProps<{
  archiveInfo: object;
  propName: string;
}>();

function convertToKB(byte: number) {
  return typeof byte === "number" ? Math.round(byte / 1024) : 0;
}
</script>

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
