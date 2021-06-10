<template>
  <div class="centerize notification">
    <div class="control barText">
      <p class="label">Installing ESP-IDF...</p>
      <div class="icon is-large is-size-4">
        <iconify-icon
          :icon="
            statusEspIdf === statusType.installed
              ? 'check'
              : statusEspIdf === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusEspIdf !== statusType.installed &&
              statusEspIdf !== statusType.failed,
          }"
        />
      </div>
    </div>
    <DownloadStatus
      name="ESP-IDF"
      :downloadStatus="idfDownloadStatus"
      :destPath="espIdf"
      :status="statusEspIdf"
      v-if="isInstalling"
    />
    <div class="control barText" v-if="espIdfErrorStatus">
      <p class="label">{{ espIdfErrorStatus }}</p>
      <div class="icon is-large is-size-4">
        <iconify-icon
          :icon="
            statusEspIdf === statusType.installed
              ? 'check'
              : statusEspIdf === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusEspIdf !== statusType.installed &&
              statusEspIdf !== statusType.failed,
          }"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { IDownload, StatusType } from "../../types";
import DownloadStatus from "../DownloadStatus.vue";

@Component({
  components: {
    DownloadStatus,
  },
})
export default class EspIdfStatus extends Vue {
  @State("espIdf") private storeEspIdf: string;
  @State("espIdfErrorStatus") private storeErrorStatus: string;
  @State("idfDownloadStatus") private storeIdfDownloadStatus: IDownload;
  @State("isIdfInstalling") private storeIsInstalling: boolean;
  @State("statusEspIdf") private storeEspIdfStatus: StatusType;

  get espIdfErrorStatus() {
    return this.storeErrorStatus;
  }

  get espIdf() {
    return this.storeEspIdf;
  }

  get idfDownloadStatus() {
    return this.storeIdfDownloadStatus;
  }

  get isInstalling() {
    return this.storeIsInstalling;
  }

  get statusEspIdf() {
    return this.storeEspIdfStatus;
  }

  get statusType() {
    return StatusType;
  }
}
</script>

