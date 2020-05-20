<template>
  <div class="notification">
    <button class="delete" @click="dismiss"></button>
    <p class>
      {{ info.ts }}s: {{ info.type }} {{ info.size }} bytes @
      <code>{{ info.addr }}</code> in <code>{{ info.task }}</code> task
    </p>
    <stack-trace
      v-bind:tree="createTreeFromAddressArray(info.callers)"
    ></stack-trace>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const QuickCallStack = Vue.extend({
  name: "QuickCallStack",
  props: {
    info: Object,
  },
  methods: {
    dismiss() {
      this.$emit("dismiss");
    },
    createTreeFromAddressArray(e) {
      return this.$root.createTreeFromAddressArray(e);
    },
  },
});
export default QuickCallStack;
</script>
