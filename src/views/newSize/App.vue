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
    <div class="settings-content">
      <div class="settings-section">
        <div class="settings-section-content">
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
            <div class="settings-search">
              <input
                class="vscode-input"
                type="text"
                placeholder="Search"
                v-model="searchText"
              />
              <span class="settings-search-icon">
                <IconSearch />
              </span>
            </div>
            <div
              v-for="(archiveInfo, archiveName) in filteredArchives"
              :key="archiveName"
              class="settings-archive"
            >
              <ArchiveItem
                :archiveInfo="archiveInfo"
                :archiveName="archiveName.toString()"
              />
              <div
                class="settings-archive-content"
                v-if="archiveInfo.files && archiveInfo.isFileInfoVisible"
              >
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
@use "../commons/espCommons.scss" as *;

#app {
  padding: 1rem;
  color: var(--vscode-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
}

.settings-section-content {
  padding: 1rem;
}

.settings-search {
  position: relative;
  margin-bottom: 1rem;
}

.settings-search .vscode-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  padding-right: 28px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.settings-search .vscode-input:hover {
  border-color: var(--vscode-input-border);
}

.settings-search .vscode-input:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.settings-search-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: var(--vscode-input-foreground);
  opacity: 0.8;
}

.settings-search-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.settings-archive {
  margin-bottom: 1rem;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-settings-dropdownBorder);
  border-radius: 2px;
  overflow: hidden;
}

.settings-archive:last-child {
  margin-bottom: 0;
}

.settings-archive-content {
  padding: 1rem;
  border-top: 1px solid var(--vscode-settings-dropdownBorder);
  overflow: auto;
}
</style>
