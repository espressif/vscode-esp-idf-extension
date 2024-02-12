<script setup lang="ts">
import { TraceInfo, useTracingStore } from "../store";
const props = defineProps<{
  info: TraceInfo;
}>();

const store = useTracingStore();
</script>

<template>
  <div class="notification">
    <button class="delete" @click="$emit('dismiss')"></button>
    <p class>
      {{ info.ts }}s: {{ info.type }} {{ info.size }} bytes @
      <code>{{ info.addr }}</code> in <code>{{ info.task }}</code> task
    </p>
    <stack-trace
      v-bind:tree="store.createTreeFromAddressArray(info.callers)"
    ></stack-trace>
  </div>
</template>
