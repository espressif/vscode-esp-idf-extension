<template>
  <div class="target-conf">
    <p class="title">IDF_TARGET and OpenOCD Configuration files</p>
    <p class="notification">
      Please add OpenOCD cfg separated by comma like
      <span>interface/ftdi/esp32_devkitj_v1.cfg,board/esp32-wrover.cfg</span>.
    </p>
    <div class="field">
      <label for="openocd-cfgs" class="label">
        OpenOCD Configuration files (Relative paths to OPENOCD_SCRIPTS)</label
      >
      <textarea
        name="openocd-cfgs"
        id="openocd-cfgs"
        cols="20"
        rows="4"
        v-model="openOcdCfgs"
        class="input textarea is-small"
      ></textarea>
    </div>
    <div class="field centerize">
      <label for="idf-target" class="label">Choose ESP-IDF Target</label>
      <div class="control">
        <select
          name="idf-target"
          id="idf-target"
          v-model="selectedIdfTarget"
          class="select"
        >
          <option value="esp32">ESP-32</option>
          <option value="esp32">ESP-32 S2</option>
        </select>
      </div>
    </div>
    <br />
    <div class="field centerize">
      <div class="control">
        <router-link to="/components" class="button"
          >Go to components</router-link
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Mutation, State } from "vuex-class";

@Component
export default class TargetConf extends Vue {
  @Mutation setIdfTarget;
  @Mutation setOpenOcdCfgs;
  @State("openOcdCfgs") private storeOpenOcdCfgs: string;
  @State("selectedIdfTarget") private storeSelectedIdfTarget: string;

  get openOcdCfgs() {
    return this.storeOpenOcdCfgs;
  }
  set openOcdCfgs(newVal) {
    this.setOpenOcdCfgs(newVal);
  }

  get selectedIdfTarget() {
    return this.storeSelectedIdfTarget;
  }
  set selectedIdfTarget(newVal) {
    this.setIdfTarget(newVal);
  }
}
</script>

<style scoped>
.target-conf {
  width: 50%;
}
</style>
