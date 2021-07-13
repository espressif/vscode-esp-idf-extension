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

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { IExampleCategory, IExample } from "../../../examples/Example";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class TemplateList extends Vue {
  @Action private getTemplateDetail;
  @Mutation private setSelectedTemplate;
  @Mutation private setTemplateDetail;
  @Mutation private showTemplateDetail;
  @State("selectedTemplate") private storeSelectedTemplate: IExample;
  @Prop() node: IExampleCategory;

  get selectedTemplate() {
    return this.storeSelectedTemplate;
  }

  public toggleTemplateDetail(template: IExample) {
    if (template.path !== this.storeSelectedTemplate.path) {
      this.setSelectedTemplate(template);
      this.setTemplateDetail("No README.md available for this project.");
      this.getTemplateDetail({ pathToOpen: template.path });
    } else {
      this.showTemplateDetail();
    }
  }
}
</script>
