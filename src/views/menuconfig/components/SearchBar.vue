<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useMenuconfigStore } from '../store';

const store = useMenuconfigStore();

const { searchString, textDictionary } = storeToRefs(store);

</script>

<template>
  <div id="topbar" class="field is-grouped is-grouped-centered">
    <div class="control wide">
      <input
        v-model="searchString"
        type="search"
        name="search"
        placeholder="Search parameter"
        autocomplete="off"
        class="input"
      />
    </div>
    <div class="control">
      <button class="button" @click="store.saveGuiConfig" id="searchbar-save">
        {{ textDictionary.save }}
      </button>
    </div>
    <div class="control">
      <button class="button" @click="store.resetGuiConfig">
        {{ textDictionary.discard }}
      </button>
    </div>
    <div class="control">
      <button class="button" @click="store.setDefaultConfig">
        {{ textDictionary.reset }}
      </button>
    </div>
  </div>
</template>

<style scoped>
#topbar {
  padding-top: 0.5em;
}
.wide {
  width: 40%;
}
</style>