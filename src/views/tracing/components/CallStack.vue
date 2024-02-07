<script setup lang="ts">
import { Ref, computed, ref } from "vue";
import { useTracingStore } from "../store";
import {
  IconHistory,
  IconSearch,
  IconTriangleUp,
  IconTriangleDown,
} from "@iconify-prerendered/vue-codicon";

const props = defineProps<{
  callstack: any;
  cache: Object;
}>();

const itemRefs: Ref<any[]> = ref([]);

const store = useTracingStore();

const isExpanded: Ref<boolean> = ref(false);
const filter: Ref<{ functionName: string; selectedEventType: string }> = ref({
  functionName: "",
  selectedEventType: "all",
});
const sort: Ref<{ by: string; order: number }> = ref({
  by: "",
  order: 0,
});

const callStack = computed(() => {
  return props.callstack
    .filter((calls) => {
      if (filter.value.functionName && filter.value.functionName !== "") {
        return (
          fetchFunctionNameForAddr(calls[0])
            .toLowerCase()
            .match(filter.value.functionName.toLowerCase()) ||
          fetchFilePathForAddr(calls[0])
            .toLowerCase()
            .match(filter.value.functionName.toLowerCase())
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sort.value.by !== "" && sort.value.order !== 0) {
        return sortBy(a[0], b[0]);
      }
      return 0;
    });
});

const totalMemory = computed(() => {
  let total = 0;
  Object.keys(props.cache).forEach((addr) => {
    total += props.cache[addr].size ? props.cache[addr].size : 0;
  });
  return total;
});

function sortData(columnName) {
  sort.value.by = columnName;
  sort.value.order = sort.value.order === 0 ? 1 : -sort.value.order;
}
function createTreeFromAddressArray(addr: string[]): any {
  return store.createTreeFromAddressArray(addr);
}
function fetchFunctionNameForAddr(addr: string): string {
  return props.cache[addr]
    ? props.cache[addr].funcName !== ""
      ? props.cache[addr].funcName
      : addr
    : addr;
}
function fetchFilePathForAddr(addr: string): string {
  return props.cache[addr]
    ? props.cache[addr].filePath !== ""
      ? props.cache[addr].filePath
      : addr
    : addr;
}
function reverseCallStack() {
  props.callstack.forEach((calls) => {
    calls.reverse();
  });
}
function sortBy(a, b) {
  const key = sort.value.by;
  const sortOrder = sort.value.order;
  if (sortOrder === -1) {
    return props.cache[a][key] - props.cache[b][key];
  } else if (sortOrder === 1) {
    return props.cache[b][key] - props.cache[a][key];
  }
  return 0;
}
function collapseOrExpandCalls() {
  if (itemRefs && itemRefs.value && itemRefs.value.length > 0) {
    itemRefs.value.forEach((calls) => {
      calls.children[0].__vueParentComponent.exposed["collapseAndExpandAll"] &&
        calls.children[0].__vueParentComponent.exposed["collapseAndExpandAll"](
          !isExpanded.value
        );
    });
  }
  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <div>
    <div class="field has-addons">
      <div class="control">
        <div class="select">
          <select
            v-model="filter.selectedEventType"
            @change="$emit('event-filter-updated', filter.selectedEventType)"
          >
            <option selected value="all">All</option>
            <option value="allocations">Allocations</option>
            <option value="free">Free</option>
            <option value="irq-all">IRQ All</option>
            <option value="irq-allocationa">IRQ Allocations</option>
            <option value="irq-free">IRQ Free</option>
          </select>
        </div>
      </div>
      <div class="control has-icons-left is-expanded">
        <input
          class="input is-small"
          type="text"
          placeholder="Search Function Name"
          v-model="filter.functionName"
        />
        <span class="icon is-small is-left">
          <IconSearch />
        </span>
      </div>
      <div class="control">
        <button class="button" @click="reverseCallStack">
          <span class="icon is-small">
            <IconHistory />
          </span>
          <span>Reverse Call Stack</span>
        </button>
      </div>
      <div class="control">
        <button class="button" @click="collapseOrExpandCalls">
          <template v-if="isExpanded">
            <span class="icon is-small">
              <IconTriangleUp />
            </span>
            <span>Collapse All</span>
          </template>
          <template v-else>
            <span class="icon is-small">
              <IconTriangleDown />
            </span>
            <span>Expand All</span>
          </template>
        </button>
      </div>
    </div>
    <div class="columns head">
      <div class="column is-2">
        Bytes Used
        <span class="is-pointer" @click="sortData('size')">{{
          sort.by === "size" && sort.order === 1 ? "▾" : "▴"
        }}</span>
      </div>
      <div class="column is-2">
        Count
        <span class="is-pointer" @click="sortData('count')">{{
          sort.by === "count" && sort.order === 1 ? "▾" : "▴"
        }}</span>
      </div>
      <div class="column">Function Name</div>
    </div>
    <div class="scroll-container">
      <div v-for="(calls, index) in callStack" :key="index" ref="itemRefs">
        <calls
          ref="callRef"
          v-bind:tree="createTreeFromAddressArray(calls)"
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
