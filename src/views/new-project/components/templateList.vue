<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  IconChevronRight,
  IconChevronDown,
} from "@iconify-prerendered/vue-codicon";
import { IExample, IExampleCategory } from "../../../examples/Example";
import TemplateList from "./templateList.vue";
import { useNewProjectStore } from "../store";

const store = useNewProjectStore();

const props = defineProps<{
  node: IExampleCategory;
}>();

const openStates = ref<Record<string, boolean>>({});

const filteredExamples = computed(() => {
  if (store.searchString !== "") {
    return props.node.examples.filter(
      (e) => e.name.indexOf(store.searchString) >= 0
    );
  }
  return props.node.examples;
});

// Initialize open states to false (collapsed)
const initializeOpenStates = (node: IExampleCategory) => {
  if (!node) return;
  openStates.value[node.name] = node.name === "Search Results" ? true : false;
  if (node.subcategories && node.subcategories.length > 0) {
    node.subcategories.forEach((subCat) => {
      initializeOpenStates(subCat);
    });
  }
};

function toggleItem(node: IExampleCategory) {
  if (!node) return;
  openStates.value[node.name] = !openStates.value[node.name];
}

function toggleTemplateDetail(template: IExample) {
  if (template.path !== store.selectedTemplate.path) {
    store.selectedTemplate = template;
    store.templateDetail = "No README.md available for this project.";
    store.getTemplateDetail({ pathToOpen: template.path });
  } else {
    store.hasTemplateDetail = !store.hasTemplateDetail;
  }
}

onMounted(() => {
  initializeOpenStates(props.node);
});
</script>

<template>
  <li class="tree-item">
    <div
      class="tree-item-content"
      :class="{
        'has-children':
          (props.node.subcategories && props.node.subcategories.length > 0) ||
          (filteredExamples && filteredExamples.length > 0),
      }"
    >
      <div
        v-if="
          (props.node.subcategories && props.node.subcategories.length > 0) ||
          (filteredExamples && filteredExamples.length > 0)
        "
        class="tree-item-toggle"
        @click="toggleItem(props.node)"
      >
        <IconChevronRight v-if="!openStates[props.node.name]" />
        <IconChevronDown v-else />
      </div>
      <div v-else class="tree-item-toggle-placeholder"></div>
      <div
        class="tree-item-label category"
        v-text="props.node.name"
        @click="toggleItem(props.node)"
        :data-node-name="props.node.name"
      ></div>
    </div>
    <ul
      v-if="
        props.node.subcategories &&
        props.node.subcategories.length > 0 &&
        openStates[props.node.name]
      "
      class="tree-list"
    >
      <TemplateList
        v-for="nodeSubCat in props.node.subcategories"
        :key="nodeSubCat.name"
        :node="nodeSubCat"
      />
    </ul>
    <ul
      v-if="
        filteredExamples &&
        filteredExamples.length > 0 &&
        openStates[props.node.name]
      "
      class="tree-list"
    >
      <li v-for="item in filteredExamples" :key="item.path" class="tree-item">
        <div
          class="tree-item-content"
          :class="{ selected: store.selectedTemplate.path === item.path }"
          @click="toggleTemplateDetail(item)"
          :data-example-id="item.name"
          :title="item.path"
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
  cursor: pointer;
  border-radius: 2px;
}

.tree-item-content:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.tree-item-content.selected {
  background-color: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.tree-item-toggle,
.tree-item-toggle-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  flex-shrink: 0;
}

.tree-item-toggle {
  color: var(--vscode-foreground);
  cursor: pointer;
}

.tree-item-toggle:hover {
  color: var(--vscode-foreground);
}

.tree-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
  font-size: 13px;
}

.tree-item-label.category {
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
}

.tree-list .tree-list {
  padding-left: 10px;
}
</style>
