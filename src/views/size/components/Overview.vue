<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSizeStore } from "../store";

const store = useSizeStore();

const { overviewData } = storeToRefs(store);
function convertToKB(byte: number) {
  return typeof byte === "number" ? Math.round(byte / 1024) : 0;
}

function getArchiveProp(prop1: string, prop2: string) {
  return Object.keys(overviewData).indexOf(prop1) !== -1
    ? overviewData[prop1]
    : overviewData[prop2];
}
</script>

<template>
  <div class="notification is-clipped">
    <nav class="level is-mobile">
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">.data</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(getArchiveProp("diram_data", "dram_data")) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">.bss</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(getArchiveProp("diram_bss", "dram_bss")) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">Text</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(getArchiveProp("diram_text", "dram_text")) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">Flash Code</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewData['flashCode']) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">Flash Rodata</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewData['flashRodata']) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered" v-if="overviewData['flashOther']">
        <div>
          <p class="heading is-size-7-mobile">Flash other</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewData['flashOther']) }}KB
          </p>
        </div>
      </div>
    </nav>
  </div>
</template>
