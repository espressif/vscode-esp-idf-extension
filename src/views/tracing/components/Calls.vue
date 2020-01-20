<template>
  <div class="calls">
    <div class="columns">
      <div class="column is-2">
        {{tree.size}}
        &nbsp;
        <span class="is-pulled-right is-hidden-mobile">
          {{percentage() === "(0.00%)" ? "" : percentage()}}
          &nbsp;&nbsp;
        </span>
      </div>
      <div class="column is-2">{{tree.count}}</div>
      <div class="column">
        <span v-html="spaces"></span>
        <span class="link" @click="toggle" v-if="tree.child">{{ isOpen ? '▼' : '▶' }}</span>
        <span v-else>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <strong>{{tree.name}}</strong>
        <span class="is-pull-right">
          <template v-if="tree.filePath !== '' && tree.lineNumber !== ''">
            <a href="#" @click="openFileAtLine(tree.filePath, tree.lineNumber)">{{tree.description}}</a>
          </template>
          <template v-else>{{tree.description !== ':' ? `(${tree.description})` : ""}}</template>
        </span>
      </div>
    </div>
    <div v-show="isOpen" v-if="tree.child">
      <Calls v-bind:tree="tree.child" v-bind:space="space+1" :total="total"></Calls>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const Calls = Vue.extend({
  name: "Calls",
  props: {
    tree: Object,
    space: Number,
    total: Number
  },
  data() {
    return {
      isOpen: false
    };
  },
  methods: {
    toggle() {
      if (this.tree.child) {
        this.isOpen = !this.isOpen;
      }
    },
    collapseAndExpandAll(isExpand: boolean) {
      this.$children.forEach(child => {
        child.collapseAndExpandAll(isExpand);
        if (this.tree.child) {
          this.isOpen = isExpand;
        }
      });
    },
    percentage() {
      return `(${Math.ceil((this.tree.size / this.total) * 100).toFixed(2)}%)`;
    },
    openFileAtLine(filePath: string, lineNumber: string) {
      const lineNumberInt = parseInt(lineNumber.match(/[0-9]*/)[0]);
      this.$root.treeOpenFileHandler(filePath, lineNumberInt);
    }
  },
  computed: {
    spaces() {
      return new Array(this.space).join("&nbsp;&nbsp;&nbsp;&nbsp;");
    }
  }
});
export default Calls;
</script>

<style lang="scss" scoped>
* {
  font-size: 12px;
}
.link {
  cursor: pointer;
}
.columns {
  margin: 0 auto;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: var(--vscode-foreground);
}
.column {
  padding: 0.3rem;
}
</style>
