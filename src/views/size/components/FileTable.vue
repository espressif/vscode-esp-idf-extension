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
        <td class="has-text-right">Total</td>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(fileInfo, fileName) in archiveInfo.files" :key="fileName">
        <!-- <td>{{count}}</td> -->
        <td class="has-text-right">{{ fileName }}</td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo[".dram0.data"]) }}
        </td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo[".dram0.bss"]) }}
        </td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo[".iram0.text"]) }}
        </td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo[".flash.text"]) }}
        </td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo[".flash.rodata"]) }}
        </td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo["ram_st_total"]) }}
        </td>
        <td class="has-text-right">
          {{ convertToSpacedString(fileInfo["flash_total"]) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { isNumber } from "util";
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class FileTable extends Vue {
  @Prop() archiveInfo;
  convertToSpacedString(byte: number) {
    return isNumber(byte) ? byte.toLocaleString("en-US").replace(/,/g, " ") : 0;
  }
}
</script>
