<script setup lang="ts">
import { Ref, computed, ref } from "vue";
import { useTracingStore } from "../store";

const props = defineProps<{
  cache: object;
  leaks: object;
}>();

const store = useTracingStore();

const isExpanded: Ref<boolean> = ref(false);
const filter: Ref<{ functionName: string }> = ref({
  functionName: "",
});

const callRef: Ref<any[]> = ref([]);

const leakList = computed(() => {
  return Object.keys(props.leaks).filter((calls) => {
    if (filter.value.functionName && filter.value.functionName !== "") {
      return (
        fetchFunctionNameForAddr(calls)
          .toLowerCase()
          .match(filter.value.functionName.toLowerCase()) ||
        fetchFunctionFilePath(calls)
          .toLowerCase()
          .match(filter.value.functionName.toLowerCase())
      );
    }
    return true;
  });
});
const totalMemory = computed(() => {
  let total = 0;
  Object.keys(props.cache).forEach((addr) => {
    total += props.cache[addr].size ? props.cache[addr].size : 0;
  });
  return total;
});

function createTreeFromAddressArray(addr: string): any {
  const calls = props.leaks[addr].evt.callers;
  return store.createTreeFromAddressArray(calls);
}
function reverseCallStack() {
  leakList.value.forEach((addr) => {
    props.leaks[addr].evt.callers.reverse();
  });
}
function collapseOrExpandCalls() {
  if (callRef && callRef.value && callRef.value.length > 0) {
    callRef.value.forEach((calls) => {
      calls.collapseAndExpandAll &&
        calls.collapseAndExpandAll(!this.isExpanded);
    });
  }
  isExpanded.value = !isExpanded;
}
function fetchFunctionNameForAddr(addr: string): string {
  const tree = store.createTreeFromAddressArray([addr]);
  if (tree && tree.name) {
    return tree.name;
  }
  return addr;
}
function fetchFunctionFilePath(addr: string): string {
  const tree = store.createTreeFromAddressArray([addr]);
  if (tree && tree.description) {
    return tree.description;
  }
  return addr;
}
</script>

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
          <iconify-icon icon="search" />
        </span>
      </div>
      <div class="control">
        <button class="button" @click="reverseCallStack">
          <span class="icon is-small">
            <iconify-icon icon="history" />
          </span>
          <span>Reverse Call Stack</span>
        </button>
      </div>
      <div class="control">
        <button class="button" @click="collapseOrExpandCalls()">
          <template v-if="isExpanded">
            <span class="icon is-small">
              <iconify-icon icon="triangle-up" />
            </span>
            <span>Collapse All</span>
          </template>
          <template v-else>
            <span class="icon is-small">
              <iconify-icon icon="triangle-down" />
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

<style lang="scss" scoped>
@import "table";
</style>
