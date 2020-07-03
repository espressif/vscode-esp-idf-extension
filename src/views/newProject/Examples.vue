<template>
  <div id="examples">
    <p class="title">Select an ESP-IDF example as template</p>
    <div class="field">
      <label for="idf-category">Select category:</label>
      <div class="control">
        <select
          v-model="selectedTemplateCategory"
          id="idf-category"
          class="select is-fullwidth"
        >
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label for="example-template">Select template:</label>
      <div class="control">
        <select
          v-model="selectedTemplate"
          id="example-template"
          class="select is-fullwidth"
        >
          <option
            v-for="template in templates"
            :key="template.path"
            :value="template"
            >{{ template.name }}</option
          >
        </select>
      </div>
    </div>
    <div class="field is-grouped is-grouped-centered">
      <div class="control">
        <router-link
          to="/target-settings"
          class="button"
          v-on:click.native="setNullTemplate"
          >No template</router-link
        >
      </div>
      <div class="control">
        <router-link to="/target-settings" class="button"
          >Use selected template</router-link
        >
      </div>
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
  @Mutation private setProjectName;
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
  set selectedTemplate(newTemplateName) {
    this.setSelectedTemplate(newTemplateName);
    this.setProjectName(newTemplateName.name);
  }

  setNullTemplate() {
    const nullTemplate = { name: "", category: "", path: "" };
    this.setSelectedTemplate(nullTemplate);
    this.setProjectName("my-esp-idf-project");
  }

  private mounted() {
    this.loadExamples();
  }
}
</script>

<style>
#examples {
  width: 50%;
}
</style>
