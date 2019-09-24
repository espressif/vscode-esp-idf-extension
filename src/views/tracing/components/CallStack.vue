<template>
  <div>
    <div class="field has-addons">
      <p class="control">
        <button class="button" @click="isCallStackReverse = !isCallStackReverse">
          <span class="icon is-small">
            <i class="fas fa-history"></i>
          </span>
          <span>Reverse Call Stack</span>
        </button>
      </p>
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
    }
  },
  computed: {
    callStack() {
      if (this.isCallStackReverse) {
        const tempCallStack = [];
        this.callstack.forEach((calls, index) => {
          tempCallStack.push(calls.slice().reverse());
        });
        return tempCallStack;
      } else {
        return this.callstack;
      }
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
button{
  font-size: 10px;
}
</style>