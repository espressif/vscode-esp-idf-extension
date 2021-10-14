<template>
  <div id="app">
    <Header />
    <div class="section no-padding-top">
      <div class="container is-mobile">
        <SizeFilter />
        <div v-if="isOverviewEnabled">
          <Overview />
          <ProgressBar
            name="D/IRAM"
            :usedData="overviewData.used_diram"
            :usedRatioData="overviewData.used_diram_ratio"
            :totalData="overviewData.diram_total"
            v-if="overviewData.diram_total"
          />
          <ProgressBar
            name="DRAM"
            :usedData="overviewData.used_dram"
            :usedRatioData="overviewData.used_dram_ratio"
            :totalData="overviewData.dram_total"
            v-if="overviewData.dram_total"
          />
          <ProgressBar
            name="IRAM"
            :usedData="overviewData.used_iram"
            :usedRatioData="overviewData.used_iram_ratio"
            :totalData="overviewData.iram_total"
            v-if="overviewData.iram_total"
          />
        </div>
        <div v-else>
          <div class="field">
            <p class="control has-icons-right">
              <input
                class="input"
                type="text"
                placeholder="Search"
                v-model="searchText"
              />
              <span class="icon is-right">
                <iconify-icon icon="search" />
              </span>
            </p>
          </div>
          <div
            v-for="(archiveInfo, archiveName) in filteredArchives"
            :key="archiveName"
            class="notification is-clipped"
          >
            <ArchiveItem
              :archiveInfo="archiveInfo"
              :archiveName="archiveName"
            />
            <div
              class="columns"
              style="overflow: auto;"
              v-if="archiveInfo.files && archiveInfo.isFileInfoVisible"
            >
              <div class="column">
                <FileTable :archiveInfo="archiveInfo" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ArchiveItem from "./components/ArchiveItem.vue";
import FileTable from "./components/FileTable.vue";
import Header from "./components/Header.vue";
import Overview from "./components/Overview.vue";
import ProgressBar from "./components/ProgressBar.vue";
import SizeFilter from "./components/SizeFilter.vue";
import { Action, Mutation, State } from "vuex-class";

@Component({
  components: {
    ArchiveItem,
    FileTable,
    Header,
    Overview,
    ProgressBar,
    SizeFilter,
  },
})
export default class App extends Vue {
  @Action requestInitialValues: Function;
  @Mutation setSearchText;
  @State("archives") storeArchives;
  @State("isOverviewEnabled") storeIsOverviewEnabled: boolean;
  @State("overviewData") storeOverviewData;
  @State("searchText") storeSearchText;

  get overviewData() {
    return this.storeOverviewData;
  }

  get isOverviewEnabled() {
    return this.storeIsOverviewEnabled;
  }

  get searchText() {
    return this.storeSearchText;
  }

  set searchText(text: string) {
    this.setSearchText(text);
  }

  get filteredArchives() {
    const { searchText } = this;
    let filteredObj = this.storeArchives;
    if (searchText !== "") {
      filteredObj = {};
      Object.keys(this.storeArchives).forEach((archive) => {
        // tslint:disable-next-line: max-line-length
        if (
          archive.toLowerCase().match(searchText.toLowerCase()) ||
          (this.storeArchives[archive].files &&
            Object.keys(this.storeArchives[archive].files).filter((file) =>
              file.toLowerCase().match(this.searchText.toLowerCase())
            ).length > 0)
        ) {
          filteredObj[archive] = this.storeArchives[archive];
        }
      });
    }
    return filteredObj;
  }

  mounted() {
    this.requestInitialValues();
  }
}
</script>

<style></style>
