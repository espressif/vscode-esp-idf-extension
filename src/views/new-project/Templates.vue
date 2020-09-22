<template>
  <div id="templates-window">
    <div id="sidenav" class="content">
      <ul>
        <li v-for="category in templateCategories" :key="category">
          <p class="category subtitle" v-text="category" />
          <ul class="templates">
            <li v-for="item in groups[category]" :key="item.path">
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
      </ul>
    </div>

    <div id="template-content" class="content">
      <div v-if="isTemplateDetailVisible" class="has-text-centered">
        <button
          v-if="selectedTemplate.name !== ''"
          v-on:click="createProject"
          class="button"
        >
          Create project using template {{ selectedTemplate.name }}
        </button>
      </div>
      <div
        v-if="isTemplateDetailVisible"
        id="templateDetail"
        v-html="templateDetail"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IExample } from "../../examples/Example";

@Component
export default class Templates extends Vue {
  @State("templates") private storeTemplates: IExample[];
  @State("selectedTemplate") private storeSelectedTemplate: IExample;
  @State("templateDetail") private storeTemplateDetail;
  @Action private createProject;
  @Action private getTemplateDetail;
  @Mutation private setSelectedTemplate;
  @Mutation private setTemplateDetail;
  private isTemplateDetailVisible = true;

  public groupBy(array: IExample[]) {
    const result = {};
    array.forEach((item) => {
      if (!result[item.category]) {
        result[item.category] = [];
      }
      result[item.category].push(item);
    });
    return result;
  }

  get groups() {
    return this.groupBy(this.storeTemplates);
  }

  get selectedTemplate() {
    return this.storeSelectedTemplate;
  }

  get templateCategories() {
    const uniqueCategories = [
      ...new Set(this.storeTemplates.map((t) => t.category)),
    ];
    const getStarted = uniqueCategories.indexOf("get-started");
    uniqueCategories.splice(0, 0, uniqueCategories.splice(getStarted, 1)[0]);
    return uniqueCategories;
  }

  get templateDetail() {
    return this.storeTemplateDetail;
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

  showTemplateDetail() {
    this.isTemplateDetailVisible = !this.isTemplateDetailVisible;
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

#templates-window {
  color: var(--vscode-editor-foreground);
  height: 100%;
  padding: 0.5em;
}
ul.templates > li > p:hover {
  color: var(--vscode-button-background);
  cursor: pointer;
}
#template-content {
  margin-left: 30%;
}
#templateDetail {
  margin: 1em;
}
#sidenav {
  height: 90%;
  overflow-y: scroll;
  position: fixed;
  text-align: start;
  width: 30%;
}
ul > li {
  list-style-type: none;
}
.category,
ul > li > p.selectedItem {
  font-weight: 900;
}
li > ul {
  margin-left: 5%;
}

blockquote {
  color: var(--vscode-foreground);
  background-color: var(--vscode-notifications-background);
}
blockquote:not(:last-child) {
  margin-bottom: 0.8em;
}
</style>
