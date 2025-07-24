<script setup lang="ts">
import { useNewProjectStore } from "./store";
import TemplateList from "./components/templateList.vue";
import searchBar from "./components/searchBar.vue";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { IconArrowLeft } from "@iconify-prerendered/vue-codicon";

const store = useNewProjectStore();
const router = useRouter();


let {
  hasTemplateDetail,
  selectedTemplate,
  templateDetail,
  templatesRootPath,
  searchString,
} = storeToRefs(store);

import type { IExample, IExampleCategory } from "../../examples/Example";

function flattenExamples(category: IExampleCategory): IExample[] {
  let result: IExample[] = [];
  if (category.examples) {
    result = result.concat(category.examples);
  }
  if (category.subcategories) {
    for (const sub of category.subcategories) {
      result = result.concat(flattenExamples(sub));
    }
  }
  return result;
}

const templates = computed(() => {
  if (!templatesRootPath.value) return [];
  if (searchString.value && searchString.value.trim() !== "") {
    // Flat list of IExample matching search
    const allCategories = Object.values(templatesRootPath.value).filter(Boolean) as IExampleCategory[];
    let allExamples: IExample[] = [];
    for (const cat of allCategories) {
      allExamples = allExamples.concat(flattenExamples(cat));
    }
    const search = searchString.value.trim().toLowerCase();
    const searchExamples = allExamples.filter((ex: IExample) => ex.name.toLowerCase().includes(search));
    return [{
      name: "Search Results",
      examples: searchExamples,
      subcategories: [],
    }] as IExampleCategory[];
  } else {
    return Object.values(templatesRootPath.value).filter(Boolean);
  }
});
const frameworks = computed(() => {
  return Object.keys(templatesRootPath.value);
});

function goToConfigure() {
  router.push("/");
}
</script>

<template>
  <div id="templates-window">
    <div id="sidenav" class="content">
      <div class="back-btn-wrapper">
        <button class="vscode-button back-btn" @click="goToConfigure">
          <IconArrowLeft style="vertical-align: middle; margin-right: 4px;" />
          Back
        </button>
      </div>
      <searchBar />
      <div class="tree-container">
        <ul class="tree-list">
          <TemplateList v-for="cat of templates" :node="cat" :key="cat.name" />
        </ul>
      </div>
    </div>

    <div id="template-content" class="content">
      <div v-if="hasTemplateDetail" class="template-actions">
        <button
          v-if="selectedTemplate.name !== ''"
          v-on:click="store.createProject"
          class="vscode-button"
          id="createProjectButton"
        >
          Create project using template {{ selectedTemplate.name }}
        </button>
      </div>
      <div
        v-if="hasTemplateDetail"
        id="templateDetail"
        class="template-detail"
        v-html="templateDetail"
      ></div>
    </div>
  </div>
</template>

<style lang="scss">
@use "../commons/espCommons.scss" as *;

/* Add a little spacing for the back button */
.back-btn-wrapper {
  margin-bottom: 1rem;
}

#templates-window {
  color: var(--vscode-editor-foreground);
  height: 100%;
  padding: 0.5em;
  display: flex;
  gap: 1rem;
}

.select-wrapper {
  margin-bottom: 1rem;
}

.vscode-select {
  width: 100%;
  padding: 4px 8px;
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%238C8C8C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}

.vscode-select:hover {
  background-color: var(--vscode-dropdown-background);
  border-color: var(--vscode-dropdown-border);
}

.vscode-select:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-select option {
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
}

#template-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.template-actions {
  margin-bottom: 1rem;
  text-align: center;
}

.vscode-button {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 32px;
  color: var(--vscode-button-foreground);
  background-color: var(--vscode-button-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

#templateDetail {
  margin: 1em;
  color: var(--vscode-editor-foreground);
}

#sidenav {
  width: 30%;
  min-width: 300px;
  max-width: 400px;
  height: 90vh;
  overflow-y: auto;
  border-right: 1px solid var(--vscode-panel-border);
  padding: 0 0.5rem;
}

.tree-container {
  margin-top: 1rem;
}

.content ul.tree-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6,
.content table thead th,
.content strong {
  color: var(--vscode-editor-foreground);
}

.content blockquote p {
  strong {
    color: var(--vscode-button-background);
  }
  color: var(--vscode-button-background);
}
</style>
