<template>
  <div>
    <div class="field has-addons">
      <div class="control">
        <div class="select">
          <select v-model="filter.selectedEventType">
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
      <div class="column is-2">Bytes Used</div>
      <div class="column is-2">Count</div>
      <div class="column">Function Name</div>
    </div>
    <div class="call-stack-container">
      <div v-for="(calls, index) in callStack" :key="index">
        <calls v-bind:tree="createTreeFromAddressArray(calls)" :index="index" :space="1"></calls>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const CallStack = Vue.extend({
  name: "CallStack",
  props: {
    callstack: Array,
    cache: Object,
  },
  data() {
    return {
      filter: {
        functionName: "",
        selectedEventType: "all"
      }
    };
  },
  methods: {
    createTreeFromAddressArray(addr: string[]): any {
      const root = this.$root as any;
      return root.createTreeFromAddressArray(addr);
    },
    fetchFunctionNameForAddr(addr: string): string {
      //@ts-ignore
      return this.cache[addr] ? this.cache[addr].funcName !== "" ? this.cache[addr].funcName : addr : addr;
    },
    reverseCallStack() {
      this.callstack.forEach((calls) => {
        calls.reverse();
      });
    }
  },
  computed: {
    callStack() {
      return this.callstack
      .filter((calls) => {
        if (this.filter.functionName && this.filter.functionName !== "") {
          return this.fetchFunctionNameForAddr(calls[0]).toLowerCase().match(this.filter.functionName.toLowerCase())
        }
        return true;
      })
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
</style>