<script setup lang="ts">
import { IExample, IExampleCategory } from "../../../examples/Example";
import { useExamplesStore } from "../store";
import ExampleList from "./exampleList.vue";

const store = useExamplesStore();

defineProps<{
  node: IExampleCategory;
}>();

function toggleExampleDetail(example: IExample) {
  if (example.path !== this.selectedExample.path) {
    store.selectedExample = example;
    store.exampleDetail = "No README.md available for this project.";
    store.getExampleDetail({ pathToOpen: example.path });
  } else {
    store.hasExampleDetail = !store.hasExampleDetail;
  }
}
</script>

<template>
  <li>
    <h3 class="category is-3" v-text="node.name"></h3>
    <ul class="subcategories">
      <ExampleList
        v-for="nodeSubCat in node.subcategories"
        :key="nodeSubCat.name"
        :node="nodeSubCat"
      />
    </ul>
    <ul class="examples" v-if="node.examples && node.examples.length">
      <li v-for="item in node.examples" :key="item.path">
        <p
          @click="toggleExampleDetail(item)"
          v-text="item.name"
          :class="{
            selectedItem: store.selectedExample.path === item.path,
          }"
          :data-example-id="item.name"
        />
      </li>
    </ul>
  </li>
</template>
