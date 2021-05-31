<template>
  <div class="centerize notification" v-if="isWinPlatform">
    <div class="control barText">
      <p class="label">Installing IDF Prerequisites...</p>
      <div class="icon is-large is-size-4">
        <iconify-icon
          :icon="
            statusIdfGit === statusType.installed &&
            statusIdfPython === statusType.installed
              ? 'check'
              : statusIdfGit === statusType.failed &&
                statusIdfPython === statusType.failed
              ? 'close'
              : 'loading'
          "
          :class="{
            gear:
              statusIdfGit !== statusType.installed &&
              statusIdfGit !== statusType.failed &&
              statusIdfPython !== statusType.installed &&
              statusIdfPython !== statusType.failed,
          }"
        />
      </div>
    </div>
    <DownloadStatus
      name="IDF-Git"
      :downloadStatus="idfGitDownloadStatus"
      :destPath="toolsDestPath + 'idf-git'"
      :status="statusIdfGit"
    />
    <DownloadStatus
      name="IDF-Python"
      :downloadStatus="idfPythonDownloadStatus"
      :destPath="toolsDestPath + 'idf-python'"
      :status="statusIdfPython"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import DownloadStatus from "../DownloadStatus.vue";
import { IDownload, StatusType } from "../../types";
import { State } from "vuex-class";

@Component({
  components: {
    DownloadStatus,
  },
})
export default class PrerequisitesStatus extends Vue {
  @State("idfGitDownloadStatus") private storeIdfGitDownloadStatus: IDownload;
  @State("idfPythonDownloadStatus")
  private storeIdfPythonDownloadStatus: IDownload;
  @State("pathSep") private storePathSep: string;
  @State("statusIdfGit") private storeStatusIdfGit: StatusType;
  @State("statusIdfPython") private storeStatusIdfPython: StatusType;
  @State("toolsFolder") private storeIdfToolsPath: string;

  get idfGitDownloadStatus() {
    return this.storeIdfGitDownloadStatus;
  }

  get idfPythonDownloadStatus() {
    return this.storeIdfPythonDownloadStatus;
  }

  get statusIdfGit() {
    return this.storeStatusIdfGit;
  }

  get statusIdfPython() {
    return this.storeStatusIdfPython;
  }

  get statusType() {
    return StatusType;
  }

  get toolsDestPath() {
    return `${this.storeIdfToolsPath}${this.storePathSep}tools${this.storePathSep}`;
  }

  get isWinPlatform() {
    return this.storePathSep.indexOf("\\") !== -1;
  }
}
</script>
