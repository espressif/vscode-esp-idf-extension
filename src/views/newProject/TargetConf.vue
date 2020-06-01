<template>
  <div class="target-conf">
    <p>
      Please add OpenOCD Configuration files separated by comma like
      "interface/ftdi/esp32_devkitj_v1.cfg,board/esp32-wrover.cfg".
    </p>
    <div class="group">
      <label for="openocd-cfgs">
        OpenOCD Configuration files (Relative paths to OPENOCD_SCRIPTS)</label
      >
      <textarea
        name="openocd-cfgs"
        id="openocd-cfgs"
        cols="20"
        rows="4"
        v-model="openOcdCfgs"
      ></textarea>
    </div>
    <div class="group">
      <label for="idf-target">Choose ESP-IDF Target</label>
      <select name="idf-target" id="idf-target" v-model="selectedIdfTarget">
        <option value="esp32">ESP-32</option>
        <option value="esp32">ESP-32 S2</option>
      </select>
    </div>
    <br />
    <div class="group">
      <router-link to="/components" class="button"
        >Go to components</router-link
      >
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
  display: flex;
  flex-direction: column;
  align-items: center;
}
.target-conf textarea {
  width: -webkit-fill-available;
  width: 100%;
}
</style>
