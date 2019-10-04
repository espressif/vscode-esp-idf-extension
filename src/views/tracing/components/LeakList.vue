<template>
  <div>
    <div class="columns headers">
      <div class="column is-2">Bytes Used</div>
      <div class="column is-2">Leaks</div>
      <div class="column">Function Name</div>
    </div>
    <div class="scroll-container">
      <div v-for="(addr, index) in leakList" :key="index">
        <calls
          v-bind:tree="createTreeFromAddressArray(addr)"
          :index="index"
          :space="1"
          :total="totalMemory"
        ></calls>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const LeakList = Vue.extend({
  name: "LeakList",
  props: {
    cache: Object,
    leaks: Object
  },
  computed: {
    leakList() {
      return Object.keys(this.leaks);
    },
    totalMemory() {
      let total = 0;
      Object.keys(this.cache).forEach(addr => {
        total += this.cache[addr].size ? this.cache[addr].size : 0;
      });
      return total;
    }
  },
  methods: {
    createTreeFromAddressArray(addr: string): any {
      const calls = this.leaks[addr].evt.callers;
      return this.$root.createTreeFromAddressArray(calls);
    }
  }
});
export default LeakList;
</script>

<style lang="scss" scoped>
@import "table";
</style>