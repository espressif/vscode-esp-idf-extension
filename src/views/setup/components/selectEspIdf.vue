<template>
  <div id="select-esp-idf-version">
    <div class="field">
      <label for="idf-mirror-select" class="label"
        >Select download server:</label
      >
      <div class="control">
        <div class="select">
          <select v-model="selectedIdfMirror" @change="clearIDfErrorStatus">
            <option :value="idfMirror.Espressif">Espressif</option>
            <option :value="idfMirror.Github">Github</option>
          </select>
        </div>
      </div>
    </div>
    <div class="field">
      <label class="checkbox is-small">
        <input type="checkbox" v-model="showGithubTags" />
        Show all ESP-IDF tags
      </label>
    </div>
    <div class="field">
      <label for="idf-version-select" class="label"
        >Select ESP-IDF version:</label
      >
      <div class="control">
        <div class="select">
          <select
            v-model="selectedIdfVersion"
            @change="clearIDfErrorStatus"
            id="select-esp-idf"
          >
            <option
              v-for="ver in idfVersionList"
              :key="ver.name"
              :value="ver"
              >{{ ver.name }}</option
            >
          </select>
        </div>
        <div v-if="isVersionLowerThan5">
          <span class="warning-text">Whitespaces in project, ESP-IDF and ESP Tools paths are not supported in versions lower than 5.0</span>
        </div>
      </div>
    </div>
    <folderOpen
      propLabel="Enter ESP-IDF directory (IDF_PATH)"
      :propModel.sync="espIdf"
      :propMutate="setEspIdfPath"
      :openMethod="openEspIdfFolder"
      :onChangeMethod="clearIDfErrorStatus"
      v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'"
      data-config-id="manual-idf-directory"
    />
    <folderOpen
      propLabel="Enter ESP-IDF container directory"
      :propModel.sync="espIdfContainer"
      :propMutate="setEspIdfContainerPath"
      :openMethod="openEspIdfContainerFolder"
      :onChangeMethod="clearIDfErrorStatus"
      staticText="esp-idf"
      v-if="selectedIdfVersion && selectedIdfVersion.filename !== 'manual'"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { IdfMirror, IEspIdfLink } from "../types";
import { State, Action, Mutation } from "vuex-class";
import folderOpen from "./folderOpen.vue";

@Component({
  components: {
    folderOpen,
  },
})
export default class SelectEspIdf extends Vue {
  @Action private openEspIdfFolder;
  @Action private openEspIdfContainerFolder;
  @Mutation setEspIdfPath;
  @Mutation setEspIdfContainerPath;
  @Mutation setIdfMirror;
  @Mutation setSelectedEspIdfVersion;
  @Mutation setShowIdfTagList: Function;
  @Mutation setEspIdfErrorStatus;
  @State("espIdf") private storeEspIdf: string;
  @State("espIdfContainer") private storeEspIdfContainer: string;
  @State("espIdfVersionList") private storeEspIdfVersionList: IEspIdfLink[];
  @State("espIdfTags") private storeEspIdfTags: IEspIdfLink[];
  @State("selectedEspIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
  @State("selectedIdfMirror") private storeSelectedIdfMirror: IdfMirror;
  @State("showIdfTagList") private storeShowIdfTagList: boolean;

  get espIdf() {
    return this.storeEspIdf;
  }

  get espIdfContainer() {
    return this.storeEspIdfContainer;
  }

  get idfMirror() {
    return IdfMirror;
  }

  get idfVersionList() {
    if (this.showGithubTags) {
      const idfVersionWithTagsList = [...this.storeEspIdfVersionList];
      for (const idfTag of this.storeEspIdfTags) {
        const existingVersion = this.storeEspIdfVersionList.find(
          (idfVersion) => idfVersion.name === idfTag.name
        );
        if (!existingVersion) {
          idfVersionWithTagsList.push(idfTag);
        }
      }
      return idfVersionWithTagsList;
    }
    return this.storeEspIdfVersionList;
  }

  get selectedIdfVersion() {
    return this.storeSelectedIdfVersion;
  }
  set selectedIdfVersion(newValue: IEspIdfLink) {
    this.setSelectedEspIdfVersion(newValue);
  }

  get selectedIdfMirror() {
    return this.storeSelectedIdfMirror;
  }
  set selectedIdfMirror(val: IdfMirror) {
    this.setIdfMirror(val);
  }

  get showGithubTags() {
    return this.storeShowIdfTagList;
  }
  set showGithubTags(showTags: boolean) {
    this.setShowIdfTagList(showTags);
  }
  get isVersionLowerThan5() {
  if (this.selectedIdfVersion && this.selectedIdfVersion.name) {
    // Regular expression to match the version number in the format vX.X.X or release/vX.X
    const match = this.selectedIdfVersion.name.match(/v(\d+(\.\d+)?(\.\d+)?)/);
    
    // If a version number was found, parse it
    if (match) {
      const versionNumber = parseFloat(match[1]);
      // Return true if versionNumber is less than 5
      return versionNumber < 5;
    } else {
      // If no version number found, assume it's a development branch and return false
      return false;
    }
  }
  return false;
}

  public clearIDfErrorStatus() {
    this.setEspIdfErrorStatus("");
  }
}
</script>

<style scoped>
#select-esp-idf-version {
  margin: 0.25em;
}
.checkbox:hover {
  color: var(--vscode-button-background);
}
.warning-text {
  color: var(--vscode-editorWarning-foreground);
  font-size: small;
  
}
</style>
