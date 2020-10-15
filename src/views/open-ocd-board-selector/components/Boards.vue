<template>
  <div class="container">
    <div class="columns" style="flex-wrap: wrap;">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class Boards extends Vue {}
</script>
