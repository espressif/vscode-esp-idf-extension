<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewProjectStore } from "../store";

const store = useNewProjectStore();

const { searchString } = storeToRefs(store);
</script>

<template>
  <div id="topbar" class="field is-grouped is-grouped-centered">
    <div class="control wide">
      <input
        v-model="searchString"
        type="search"
        name="search"
        placeholder="Search Template By Name"
        autocomplete="off"
        class="input"
      />
    </div>
  </div>
</template>

<style scoped>
#topbar {
  padding-top: 0.5em;
}
.wide {
  width: 95%;
}
</style>
