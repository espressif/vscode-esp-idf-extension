<script setup lang="ts">
defineProps<{
  archiveInfo: any;
}>();

function getArchiveFileProp(fileInfo, firstProp, secondProp) {
  return Object.keys(fileInfo).indexOf(firstProp) !== -1
    ? fileInfo[firstProp]
    : Object.keys(fileInfo).indexOf(secondProp) !== -1
    ? fileInfo[secondProp]
    : "-";
}
</script>

<template>
  <table
    class="table is-fullwidth is-hoverable is-size-7-mobile is-size-6-tablet is-size-5-desktop"
  >
    <thead>
      <tr class="is-uppercase">
        <!-- <td>#</td> -->
        <td class="has-text-right">File Name</td>
        <td class="has-text-right">
          <abbr title="DRAM .data">.data (B)</abbr>
        </td>
        <td class="has-text-right">
          <abbr title="DRAM .bss">.bss (B)</abbr>
        </td>
        <td class="has-text-right">IRAM (B)</td>
        <td class="has-text-right">
          <abbr title="Flash Code">code(B)</abbr>
        </td>
        <td class="has-text-right">
          <abbr title="Flash Rodata">rodata (B)</abbr>
        </td>
        <td class="has-text-right">RAM ST Total</td>
        <td class="has-text-right">Flash Total</td>
        <td class="has-text-right">Total</td>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(fileInfo, fileName) in archiveInfo.files" :key="fileName">
        <!-- <td>{{count}}</td> -->
        <td class="has-text-right">{{ fileName }}</td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, ".dram0.data", "data") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, ".dram0.bss", "bss") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, ".iram0.text", "iram") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, ".flash.text", "flash_text") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, ".flash.rodata", "flash_rodata") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, "ram_st_total", "nonExistingProp") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, "flash_total", "nonExistingProp") }}
        </td>
        <td class="has-text-right">
          {{ getArchiveFileProp(fileInfo, "total", "nonExistingProp") }}
        </td>
      </tr>
    </tbody>
  </table>
</template>