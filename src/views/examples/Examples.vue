<template>
  <div id="examples-window">
    <div id="sidenav" class="content">
      <p>For external components examples, check <a v-on:click="showRegistry">IDF Component Registry</a></p>
      <ul>
        <ExampleList :node="exampleRootPath" :key="exampleRootPath.name" />
      </ul>
    </div>

    <div id="example-content" class="content">
      <div v-if="hasExampleDetail" class="has-text-centered">
        <button
          v-if="selectedExample.name !== ''"
          v-on:click="openExample(selectedExample)"
          class="button"
          id="create-button"
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
import { IExample } from "../../examples/Example";
import ExampleList from "./components/exampleList.vue";

@Component({
  components: {
    ExampleList,
  },
})
export default class Examples extends Vue {
  @State("exampleRootPath") private storeExampleRootPath;
  @State("exampleDetail") private storeExampleDetail;
  @State("hasExampleDetail") private hasExampleDetail;
  @State("selectedExample") private storeSelectedExample;
  @Action("openExample") private storeOpenExample;
  @Action private getExamplesList;
  @Action private showRegistry;

  get selectedExample() {
    return this.storeSelectedExample;
  }
  get exampleRootPath() {
    return this.storeExampleRootPath;
  }
  get exampleDetail() {
    return this.storeExampleDetail;
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
  text-align: start;
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
.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6,
.content table thead th,
.content strong {
  color: var(--vscode-editor-foreground);
}
.content blockquote p {
  strong {
    color: var(--vscode-button-background);
  }
  color: var(--vscode-button-background);
}
</style>
