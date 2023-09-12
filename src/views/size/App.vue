<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useSizeStore } from "./store";
import { storeToRefs } from "pinia";
import { Icon } from "@iconify/vue";
import ArchiveItem from "./components/ArchiveItem.vue";
import FileTable from "./components/FileTable.vue";
import Header from "./components/Header.vue";
import Overview from "./components/Overview.vue";
import ProgressBar from "./components/ProgressBar.vue";
import SizeFilter from "./components/SizeFilter.vue";

const store = useSizeStore();

const { archives, isOverviewEnabled, overviewData, searchText } = storeToRefs(
  store
);

const filteredArchives = computed<{[key: string]: any}>(() => {
  let filteredObj = archives.value;
  if (searchText.value !== "") {
    filteredObj = {};
    Object.keys(archives).forEach((archive) => {
      // tslint:disable-next-line: max-line-length
      if (
        archive.toLowerCase().match(searchText.value.toLowerCase()) ||
        (archives[archive].files &&
          Object.keys(archives[archive].files).filter((file) =>
            file.toLowerCase().match(searchText.value.toLowerCase())
          ).length > 0)
      ) {
        filteredObj[archive] = archives[archive];
      }
    });
  }
  return filteredObj;
});

onMounted(() => {
  store.requestInitialValues();
});
</script>

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
            :usedData="overviewData['used_diram']"
            :usedRatioData="overviewData['used_diram_ratio']"
            :totalData="overviewData['diram_total']"
            v-if="overviewData['diram_total']"
          />
          <ProgressBar
            name="DRAM"
            :usedData="overviewData['used_dram']"
            :usedRatioData="overviewData['used_dram_ratio']"
            :totalData="
              overviewData['dram_total'] ||
              overviewData['used_dram'] + overviewData['available_dram']
            "
            v-if="
              overviewData['dram_total'] ||
              overviewData['used_dram'] + overviewData['available_dram']
            "
          />
          <ProgressBar
            name="IRAM"
            :usedData="overviewData['used_iram']"
            :usedRatioData="overviewData['used_iram_ratio']"
            :totalData="
              overviewData['iram_total'] ||
              overviewData['used_iram'] + overviewData['available_iram']
            "
            v-if="
              overviewData['iram_total'] ||
              overviewData['used_iram'] + overviewData['available_iram']
            "
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
              :archiveName="archiveName.toString()"
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

<style lang="scss">
@import "../commons/espCommons.scss";
</style>
