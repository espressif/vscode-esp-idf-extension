<template>
  <div>
    <div class="field has-addons">
      <div class="control has-icons-left is-expanded">
        <input
          class="input is-small"
          type="text"
          placeholder="Search Function Name"
          v-model="filter.functionName"
        />
        <span class="icon is-small is-left">
          <i class="fas fa-search"></i>
        </span>
      </div>
      <div class="control">
        <button class="button" @click="reverseCallStack">
          <span class="icon is-small">
            <i class="fas fa-history"></i>
          </span>
          <span>Reverse Call Stack</span>
        </button>
      </div>
      <div class="control">
        <button class="button" @click="collapseOrExpandCalls()">
          <template v-if="isExpanded">
            <span class="icon is-small">
              <i class="fas fa-caret-square-up"></i>
            </span>
            <span>Collapse All</span>
          </template>
          <template v-else>
            <span class="icon is-small">
              <i class="fas fa-caret-square-down"></i>
            </span>
            <span>Expand All</span>
          </template>
        </button>
      </div>
    </div>
    <div class="columns head">
      <div class="column is-2">Bytes Used</div>
      <div class="column is-2">Leaks</div>
      <div class="column">Function Name</div>
    </div>
    <div class="scroll-container">
      <div v-for="(addr, index) in leakList" :key="index">
        <calls
          ref="callRef"
          v-bind:tree="createTreeFromAddressArray(addr)"
          :index="index"
          :space="1"
          :total="totalMemory"
        ></calls>
      </div>
    </div>
    <div class="columns foot">
      <div class="column is-2">Bytes Used Total</div>
      <div class="column is-2">Count Total</div>
      <div class="column">Totals</div>
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
  data() {
    return {
      isExpanded: false,
      filter: {
        functionName: ""
      }
    };
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
    },
    reverseCallStack() {
      this.leakList.forEach(addr => {
        this.leaks[addr].evt.callers.reverse();
      });
    },
    collapseOrExpandCalls() {
      if (this.$refs.callRef && this.$refs.callRef.length > 0) {
        this.$refs.callRef.forEach(calls => {
          calls.collapseAndExpandAll &&
            calls.collapseAndExpandAll(!this.isExpanded);
        });
      }
      this.isExpanded = !this.isExpanded;
    }
  }
});
export default LeakList;
</script>

<style lang="scss" scoped>
@import "table";
</style>