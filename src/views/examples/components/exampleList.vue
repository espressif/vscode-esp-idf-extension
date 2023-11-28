<script setup lang="ts">
import { computed } from "vue";
import { IExample, IExampleCategory } from "../../../examples/Example";
import { useExamplesStore } from "../store";
import ExampleList from "./exampleList.vue";

const store = useExamplesStore();

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

function toggleExampleDetail(example: IExample) {
  if (example.path !== store.selectedExample.path) {
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
    <h3
      class="category is-3"
      v-text="node.name"
      v-if="filteredExamples && filteredExamples.length"
    ></h3>
    <ul class="subcategories">
      <ExampleList
        v-for="nodeSubCat in node.subcategories"
        :key="nodeSubCat.name"
        :node="nodeSubCat"
      />
    </ul>
    <ul class="examples" v-if="filteredExamples && filteredExamples.length">
      <li v-for="item in filteredExamples" :key="item.path">
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
