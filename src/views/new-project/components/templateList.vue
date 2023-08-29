<script setup lang="ts">
import { IExample, IExampleCategory } from '../../../examples/Example';
import TemplateList from './templateList.vue';
import { useNewProjectStore } from '../store';
import { storeToRefs } from 'pinia';

const store = useNewProjectStore();

const { selectedTemplate } = storeToRefs(store);

const props = defineProps<{
  node: IExampleCategory
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
    <h3 class="category is-3" v-text="node.name"></h3>
    <ul
      class="subcategories"
      v-if="node.subcategories && node.subcategories.length"
    >
      <TemplateList
        v-for="nodeSubCat in node.subcategories"
        :key="nodeSubCat.name"
        :node="nodeSubCat"
      />
    </ul>
    <ul class="templates" v-if="node.examples && node.examples.length">
      <li v-for="item in node.examples" :key="item.path">
        <p
          @click="toggleTemplateDetail(item)"
          v-text="item.name"
          :class="{
            selectedItem: selectedTemplate.path === item.path,
          }"
        />
      </li>
    </ul>
  </li>
</template>

