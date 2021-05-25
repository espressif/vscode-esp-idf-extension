<template>
  <div class="centerize notification">
    <div class="control barText">
      <p class="label">
        Installing Python virtual environment for ESP-IDF...
      </p>
      <div class="icon is-large is-size-4">
        <iconify-icon
          :icon="
            statusPyVEnv === statusType.installed
              ? 'check'
              : statusPyVEnv === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusPyVEnv !== statusType.installed &&
              statusPyVEnv !== statusType.failed,
          }"
        />
      </div>
    </div>
    <div
      class="field"
      v-if="pyReqsLog && statusPyVEnv !== statusType.installed"
    >
      <p id="python-log" class="notification">{{ pyReqsLog }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { State } from "vuex-class";
import { StatusType } from "../../types";

@Component
export default class PythonPkgsStatus extends Vue {
  @State("pyReqsLog") private storePyReqsLog: string;
  @State("statusPyVEnv") private storePyVenvStatus: StatusType;

  get pyReqsLog() {
    return this.storePyReqsLog;
  }

  get statusPyVEnv() {
    return this.storePyVenvStatus;
  }

  get statusType() {
    return StatusType;
  }
}
</script>
