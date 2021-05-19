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
            selectedItem: storeSelectedExample.path === item.path,
          }"
        />
      </li>
    </ul>
  </li>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { IExampleCategory, IExample } from "../../../examples/Example";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class ExampleList extends Vue {
  @Action private getExampleDetail;
  @Mutation private showExampleDetail;
  @Mutation private setSelectedExample;
  @Mutation private setExampleDetail;
  @State("selectedExample") private storeSelectedExample: IExample;
  @Prop() node: IExampleCategory;

  get selectedExample(): IExample {
    return this.storeSelectedExample;
  }

  public toggleExampleDetail(example: IExample) {
    if (example.path !== this.selectedExample.path) {
      this.setSelectedExample(example);
      this.setExampleDetail("No README.md available for this project.");
      this.getExampleDetail({ pathToOpen: example.path });
    } else {
      this.showExampleDetail();
    }
  }
}
</script>
