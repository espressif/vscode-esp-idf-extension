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
  <li>
    <h3
      class="category is-3"
      v-text="node.name"
      v-if="filteredExamples && filteredExamples.length"
    ></h3>
    <ul class="subcategories">
      <TemplateList
        v-for="nodeSubCat in node.subcategories"
        :key="nodeSubCat.name"
        :node="nodeSubCat"
      />
    </ul>
    <ul class="templates" v-if="filteredExamples && filteredExamples.length">
      <li v-for="item in filteredExamples" :key="item.path">
        <p
          @click="toggleTemplateDetail(item)"
          v-text="item.name"
          :class="{
            selectedItem: store.selectedTemplate.path === item.path,
          }"
        />
      </li>
    </ul>
  </li>
</template>
