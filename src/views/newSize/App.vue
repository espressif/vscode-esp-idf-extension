<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useNewSizeStore } from "./store";
import { storeToRefs } from "pinia";
import { IconSearch } from "@iconify-prerendered/vue-codicon";
import Header from "./components/Header.vue";
import Overview from "./components/Overview.vue";
import ProgressBar from "./components/ProgressBar.vue";
import ArchiveItem from "./components/ArchiveItem.vue";
import FileTable from "./components/FileTable.vue";
import SizeFilter from "./components/SizeFilter.vue";
import { IDFSizeArchive } from "../../espIdf/size/types";

const store = useNewSizeStore();

const { archives, isOverviewEnabled, overviewData, searchText } = storeToRefs(
  store
);

const filteredArchives = computed<{ [key: string]: IDFSizeArchive }>(() => {
  let filteredObj = archives.value;
  if (searchText.value !== "") {
    filteredObj = {};
    Object.keys(archives.value).forEach((archive) => {
      // tslint:disable-next-line: max-line-length
      if (
        archive.toLowerCase().match(searchText.value.toLowerCase()) ||
        (archives.value[archive].files &&
          Object.keys(archives.value[archive].files).filter((file) =>
            file.toLowerCase().match(searchText.value.toLowerCase())
          ).length > 0)
      ) {
        filteredObj[archive] = archives.value[archive];
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
            v-for="section in overviewData.layout"
            :key="section.name"
            :name="section.name"
            :usedData="section.used"
            :totalData="section.total"
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
                <IconSearch />
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
