<template>
  <div id="examples-window">
    <div id="sidenav" class="content">
      <ul>
        <li v-for="(exampleGroup, groupName) in groups" :key="groupName">
          <p class="category" v-text="groupName" />
          <ul class="examples">
            <li v-for="item in exampleGroup" :key="item.path">
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
      </ul>
    </div>

    <div id="example-content" class="content">
      <div v-if="hasExampleDetail" class="has-text-centered">
        <button
          v-if="selectedExample.name !== ''"
          v-on:click="openExample(selectedExample)"
          class="button"
        >
          Create project using example {{ selectedExample.name }}
        </button>
      </div>
      <div
        v-if="hasExampleDetail"
        id="exampleDetail"
        v-html="exampleDetail"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IExample } from "./store";

@Component
export default class Examples extends Vue {
  @State("examplesPaths") private storeExamplesPath;
  @State("selectedExample") private storeSelectedExample;
  @State("hasExampleDetail") private hasExampleDetail;
  @State("exampleDetail") private storeExampleDetail;
  @Action("openExample") private storeOpenExample;
  @Action private getExamplesList;
  @Action private getExampleDetail;
  @Mutation private showExampleDetail;
  @Mutation private setSelectedExample;
  @Mutation private setExampleDetail;

  get selectedExample() {
    return this.storeSelectedExample;
  }
  get examplesPaths() {
    return this.storeExamplesPath;
  }
  get exampleDetail() {
    return this.storeExampleDetail;
  }
  get groups() {
    return this.groupBy(this.storeExamplesPath, "category");
  }

  public toggleExampleDetail(example: IExample) {
    if (example.path !== this.storeSelectedExample.path) {
      this.setSelectedExample(example);
      this.setExampleDetail("No README.md available for this project.");
      this.getExampleDetail({ pathToOpen: example.path });
    } else {
      this.showExampleDetail();
    }
  }

  public groupBy(array: string[], key: string) {
    const result = {};
    array.forEach((item) => {
      if (!result[item[key]]) {
        result[item[key]] = [];
      }
      result[item[key]].push(item);
    });
    return result;
  }

  public openExample(selectedExample: IExample) {
    this.storeOpenExample({
      pathToOpen: selectedExample.path,
      name: selectedExample.name,
    });
  }

  public created() {
    this.getExamplesList();
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";

#examples-window {
  color: var(--vscode-editor-foreground);
  height: 100%;
  padding: 0.5em;
}
ul.examples > li > p:hover {
  color: var(--vscode-button-background);
  cursor: pointer;
}
#example-content {
  margin-left: 30%;
}
#exampleDetail {
  margin: 1em;
}
#sidenav {
  height: 90%;
  width: 30%;
  overflow-y: scroll;
  position: fixed;
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
</style>
