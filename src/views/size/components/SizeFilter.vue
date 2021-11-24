<template>
  <nav class="level is-mobile">
    <div class="level-left"></div>
    <div class="level-right">
      <div class="field has-addons">
        <p class="control">
          <button
            class="button is-size-7-mobile is-size-7-tablet"
            v-on:click="toggleOverviewAndDetails"
            v-bind:class="{ 'is-static': isOverviewEnabled }"
          >
            Overview
          </button>
        </p>
        <p class="control">
          <button
            class="button is-size-7-mobile is-size-7-tablet"
            v-on:click="toggleOverviewAndDetails"
            v-bind:class="{ 'is-static': !isOverviewEnabled }"
          >
            Detailed
          </button>
        </p>
      </div>
    </div>
  </nav>
</template>


<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Mutation, State } from "vuex-class";

@Component
export default class SizeFilter extends Vue {
  @Mutation toggleOverviewAndDetails;
  @State("isOverviewEnabled") storeIsOverviewEnabled: boolean;

  get isOverviewEnabled() {
    return this.storeIsOverviewEnabled;
  }
}
</script>