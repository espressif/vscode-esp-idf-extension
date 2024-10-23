<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewSizeStore } from "../store";

const store = useNewSizeStore();

const { overviewData } = storeToRefs(store);
function convertToKB(byte: number) {
  return typeof byte === "number" ? Math.round(byte / 1024) : 0;
}
</script>

<template>
  <div class="notification is-clipped">
    <nav class="level is-mobile">
      <div
        class="level-item has-text-centered"
        v-for="overviewSection in overviewData.layout"
        :key="overviewSection.name"
      >
        <div>
          <p class="heading is-size-7-mobile">{{ overviewSection.name }}</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewSection.used) }}KB
          </p>
        </div>
      </div>
    </nav>
  </div>
</template>
