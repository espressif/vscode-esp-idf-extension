<script setup lang="ts">
import { computed } from "vue";
import { IExample, IExampleCategory } from "../../../examples/Example";
import TemplateList from "./templateList.vue";
import { useNewProjectStore } from "../store";

const store = useNewProjectStore();

const filteredExamples = computed(() => {
  if (store.searchString !== "") {
    return props.node.examples.filter(
      (e) => e.name.indexOf(store.searchString) !== -1
    );
  }
  return props.node.examples;
});

const props = defineProps<{
  node: IExampleCategory;
}>();

function toggleTemplateDetail(template: IExample) {
  if (template.path !== store.selectedTemplate.path) {
    store.selectedTemplate = template;
    store.templateDetail = "No README.md available for this project.";
    store.getTemplateDetail({ pathToOpen: template.path });
  } else {
    store.hasTemplateDetail = !store.hasTemplateDetail;
  }
}
</script>

<template>
  <li class="tree-item">
    <div v-if="filteredExamples && filteredExamples.length" class="tree-item-content">
      <div class="tree-item-toggle-placeholder"></div>
      <div class="tree-item-label category" v-text="node.name"></div>
    </div>
    <ul class="tree-list">
      <TemplateList
        v-for="nodeSubCat in node.subcategories"
        :key="nodeSubCat.name"
        :node="nodeSubCat"
      />
    </ul>
    <ul class="tree-list" v-if="filteredExamples && filteredExamples.length">
      <li v-for="item in filteredExamples" :key="item.path" class="tree-item">
        <div 
          class="tree-item-content"
          :class="{ 'selected': store.selectedTemplate.path === item.path }"
          @click="toggleTemplateDetail(item)"
        >
          <div class="tree-item-toggle-placeholder"></div>
          <div class="tree-item-label" v-text="item.name" />
        </div>
      </li>
    </ul>
  </li>
</template>

<style scoped>
.tree-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tree-item {
  margin: 0;
  padding: 0;
}

.tree-item-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 2px;
}

.tree-item-content :not(.category) {
  cursor: pointer;
}

.tree-item-content :not(.category):hover {
  background-color: var(--vscode-list-hoverBackground);
}

.tree-item-content.selected {
  background-color: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.tree-item-toggle-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  flex-shrink: 0;
}

.tree-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}

.tree-item-label.category {
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
}

.tree-list .tree-list {
  padding-left: 16px;
}
</style>

