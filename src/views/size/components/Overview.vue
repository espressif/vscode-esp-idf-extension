<template>
  <div class="notification is-clipped">
    <nav class="level is-mobile">
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">.data</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewDramData) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">.bss</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewDramBss) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">Text</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewDramText) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">Flash Code</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewData.flash_code) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div>
          <p class="heading is-size-7-mobile">Flash Rodata</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewData.flash_rodata) }}KB
          </p>
        </div>
      </div>
      <div class="level-item has-text-centered" v-if="overviewData.flash_other">
        <div>
          <p class="heading is-size-7-mobile">Flash other</p>
          <p class="title is-size-5-mobile">
            {{ convertToKB(overviewData.flash_other) }}KB
          </p>
        </div>
      </div>
    </nav>
  </div>
</template>

<script lang="ts">
import { isNumber } from "util";
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";

@Component
export default class Overview extends Vue {
  @State("overviewData") storeOverviewData;

  convertToKB(byte: number) {
    return isNumber(byte) ? Math.round(byte / 1024) : 0;
  }

  get overviewData() {
    return this.storeOverviewData;
  }

  get overviewDramData() {
    return this.storeOverviewData.dram_data
      ? this.storeOverviewData.dram_data
      : this.storeOverviewData.diram_data;
  }

  get overviewDramBss() {
    return this.storeOverviewData.dram_bss
      ? this.storeOverviewData.dram_bss
      : this.storeOverviewData.diram_bss;
  }

  get overviewDramText() {
    return this.storeOverviewData.dram_text
      ? this.storeOverviewData.dram_text
      : this.storeOverviewData.diram_text;
  }
}
</script>
