<template>
  <div id="examples-window">
    <div id="sidenav">
      <ul>
        <li v-for="(exampleGroup, groupName) in groups" :key="groupName">
          <p class="category" v-text="groupName" />
          <ul class="examples">
            <li v-for="item in exampleGroup" :key="item">
              <p
                @click="toggleExampleDetail(item)"
                v-text="item.name"
                :class="{
                  selectedItem: storeSelectedExample.name === item.name,
                }"
              />
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <div id="example-content">
      <div v-if="hasExampleDetail">
        <button
          v-if="selectedExample.name !== ''"
          v-on:click="openExample(selectedExample)"
          class="check-button"
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
    if (example.name !== this.storeSelectedExample.name) {
      this.setSelectedExample(example);
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

<style scoped>
#examples-window {
  max-width: 900px;
  color: var(--vscode-editor-foreground);
  padding-bottom: 2%;
  cursor: default;
  display: flex;
  flex-direction: row;
  height: 100%;
}
ul.examples > li > p:hover {
  color: var(--vscode-button-background);
  cursor: pointer;
}
#example-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1%;
}
.check-button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
}
.check-button:hover {
  background-color: var(--vscode-button-hoverBackground);
  box-shadow: 1px 0 5px var(--vscode-editor-foreground);
}
#exampleDetail {
  max-width: 70vh;
  margin: 2vh;
  align-items: center;
  flex: 2 0 50vh;
}
#sidenav {
  margin-top: 2vh;
  max-height: 80vh;
  max-width: 50vh;
  overflow-y: scroll;
  text-align: -webkit-left;
  flex: 1 0 30vh;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
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
