<template>
  <div class="centerize notification">
    <div class="control barText">
      <p class="label">Installing ESP-IDF Tools...</p>
      <div class="icon is-large is-size-4">
        <iconify-icon
          :icon="
            statusEspIdfTools === statusType.installed
              ? 'check'
              : statusEspIdfTools === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusEspIdfTools !== statusType.installed &&
              statusEspIdfTools !== statusType.failed,
          }"
        />
      </div>
    </div>
    <div class="toolsSection" v-if="statusEspIdfTools !== statusType.pending">
      <toolDownload v-for="tool in toolsResults" :key="tool.id" :tool="tool" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import toolDownload from "../toolDownload.vue";
import { IEspIdfTool, StatusType } from "../../types";
import { State } from "vuex-class";

@Component({
  components: {
    toolDownload,
  },
})
export default class EspIdfToolsStatus extends Vue {
  @State("toolsResults") private storeToolsResults: IEspIdfTool[];
  @State("statusEspIdfTools") private storeEspIdfToolsStatus: StatusType;

  get statusEspIdfTools() {
    return this.storeEspIdfToolsStatus;
  }

  get toolsResults() {
    return this.storeToolsResults;
  }

  get statusType() {
    return StatusType;
  }
}
</script>

<style scoped>
.toolsSection {
  display: flex;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
}
</style>
