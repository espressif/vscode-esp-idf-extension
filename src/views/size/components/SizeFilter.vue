<script setup lang="ts">
import { useSizeStore } from "../store";

const store = useSizeStore();

function toggleOverviewAndDetails() {
  store.isOverviewEnabled = !store.isOverviewEnabled;
}
</script>

<template>
  <nav class="level is-mobile">
    <div class="level-left"></div>
    <div class="level-right">
      <div class="field has-addons">
        <p class="control">
          <button
            class="button is-size-7-mobile is-size-7-tablet"
            v-on:click="toggleOverviewAndDetails"
            v-bind:class="{ 'is-static': store.isOverviewEnabled }"
          >
            Overview
          </button>
        </p>
        <p class="control">
          <button
            class="button is-size-7-mobile is-size-7-tablet"
            v-on:click="toggleOverviewAndDetails"
            v-bind:class="{ 'is-static': !store.isOverviewEnabled }"
          >
            Detailed
          </button>
        </p>
      </div>
    </div>
  </nav>
</template>
