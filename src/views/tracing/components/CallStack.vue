<template>
  <div>
    <div class="field has-addons">
      <div class="control">
        <div class="select">
          <select v-model="filter.selectedEventType" @change="eventFilterSelected">
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
    </div>
    <div class="columns headers">
      <div class="column is-2">
        Bytes Used
        <span class="is-pointer" @click="sortData('size')">
          {{sort.by === 'size' && sort.order === 1 ? '▾' : '▴'}}
        </span>
      </div>
      <div class="column is-2">
        Count
        <span class="is-pointer" @click="sortData('count')">
          {{sort.by === 'count' && sort.order === 1 ? '▾' : '▴'}}
        </span>
      </div>
      <div class="column">Function Name</div>
    </div>
    <div class="call-stack-container">
      <div v-for="(calls, index) in callStack" :key="index">
        <calls
          v-bind:tree="createTreeFromAddressArray(calls)"
          :index="index"
          :space="1"
          :total="totalMemory"
        ></calls>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
const CallStack = Vue.extend({
  name: "CallStack",
  props: {
    callstack: Array as any,
    cache: Object
  },
  data() {
    return {
      filter: {
        functionName: "",
        selectedEventType: "all"
      },
      sort: {
        by: "",
        order: 0,
      }
    };
  },
  methods: {
    sortData(columnName) {
      this.sort.by = columnName;
      this.sort.order = this.sort.order === 0 ? 1 : -this.sort.order;
    },
    createTreeFromAddressArray(addr: string[]): any {
      const root = this.$root as any;
      return root.createTreeFromAddressArray(addr);
    },
    fetchFunctionNameForAddr(addr: string): string {
      return this.cache[addr] ? this.cache[addr].funcName !== "" ? this.cache[addr].funcName : addr : addr;
    },
    reverseCallStack() {
      this.callstack.forEach(calls => {
        calls.reverse();
      });
    },
    eventFilterSelected() {
      this.$emit("event-filter-updated", this.filter.selectedEventType);
    },
    sortBy(a, b) {
      const key = this.sort.by;
      const sortOrder = this.sort.order;
      if (sortOrder === -1) {
        return this.cache[a][key] - this.cache[b][key];
      } else if (sortOrder === 1) {
        return this.cache[b][key] - this.cache[a][key];
      }
      return 0;
    }
  },
  computed: {
    callStack() {
      return this.callstack
      .filter(calls => {
        if (this.filter.functionName && this.filter.functionName !== "") {
          return this.fetchFunctionNameForAddr(calls[0])
            .toLowerCase()
            .match(this.filter.functionName.toLowerCase());
        }
        return true;
      })
      .sort((a,b) => {
        if (this.sort.by !== "" && this.sort.order !== 0) {
          return this.sortBy(a[0], b[0]);
        }
        return 0;
      });
    },
    totalMemory() {
      let total = 0;
      Object.keys(this.cache).forEach((addr) => {
        total += this.cache[addr].size ? this.cache[addr].size : 0;
      });
      return total;
    }
  }
});
export default CallStack;
</script>

<style lang="scss" scoped>
.call-stack-container {
  overflow: auto;
  height: calc(45vh);
}
.columns {
  margin: 0 auto;
  border-bottom-width: 2px;
  border-bottom-style: solid;
  border-bottom-color: var(--vscode-foreground);
}
.column {
  padding: 0.3rem;
}
button,
select,
.select,
.input {
  font-size: 12px;
  color: var(--vscode-foreground);
  background-color: var(--vscode-sideBarSectionHeader-background);
  border-color: transparent;
}
.is-pointer {
  cursor: pointer;
}
</style>