<template>
  <div id="examples-window">
    <div class="group">
      <label for="idf-category">Select category:</label>
      <select v-model="selectedTemplateCategory" id="idf-category">
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="group">
      <label for="example-template">Select template:</label>
      <select v-model="selectedTemplate" id="example-template">
        <option
          v-for="template in templates"
          :key="template.path"
          :value="template"
          >{{ template.name }}</option
        >
      </select>
    </div>
    <div class="group">
      <router-link
        to="/target-settings"
        class="button"
        v-on:click.native="setNullTemplate"
        >No template</router-link
      >
      <router-link to="/target-settings" class="button"
        >Use selected template</router-link
      >
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IExample } from "../../examples/Examples";

@Component
export default class Examples extends Vue {
  @Action private loadExamples;
  @State("templates") private storeTemplates: IExample[];
  @State("selectedTemplateCategory") private storeSelectedCategory: string;
  @State("selectedTemplate") private storeSelectedTemplate: IExample;
  @Mutation private setSelectedTemplate;
  @Mutation private setSelectedCategory;

  get categories() {
    const allCategories = this.storeTemplates.map((t) => t.category);
    const categories = allCategories.filter((val, i, self) => {
      return self.indexOf(val) === i;
    });
    return categories || [];
  }

  get templates() {
    return (
      this.storeTemplates.filter(
        (t) => t.category === this.storeSelectedCategory
      ) || []
    );
  }

  get selectedTemplateCategory() {
    return this.storeSelectedCategory;
  }
  set selectedTemplateCategory(category: string) {
    const template = this.storeTemplates.find((t) => t.category === category);
    this.setSelectedTemplate(template);
    this.setSelectedCategory(category);
  }

  get selectedTemplate() {
    return this.storeSelectedTemplate;
  }

  setNullTemplate() {
    const nullTemplate = { name: "", category: "", path: "" };
    this.setSelectedTemplate(nullTemplate);
  }

  private mounted() {
    this.loadExamples();
  }
}
</script>

<style></style>
