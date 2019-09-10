<template>
  <li>
    <div>
      <span class="link" @click="toggle" v-if="tree.child">{{ isOpen ? '▼' : '▶' }}</span>
      <span v-else>&nbsp;&nbsp;&nbsp;&nbsp;</span>
      <strong>{{tree.name}}</strong>
      <span v-if="tree.filePath !== '' && tree.lineNumber !== ''">
        <span>&nbsp;-&nbsp;</span>
        <a href="#" @click="openFileAtLine(tree.filePath, tree.lineNumber)">{{tree.description}}</a>
      </span>
    </div>
    <ul v-show="isOpen" v-if="tree.child">
      <Tree v-bind:tree="tree.child"></Tree>
    </ul>
  </li>
</template>

<script lang="ts">
import Vue from "vue";
const Tree = Vue.extend({
  name: "Tree",
  props: {
    tree: Object
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
    openFileAtLine(filePath: string, lineNumber: string) {
      const lineNumberInt = parseInt(lineNumber.match(/[0-9]*/)[0]);
      this.$root.treeOpenFileHandler(filePath, lineNumberInt);
    }
  }
});
export default Tree;
</script>

<style lang="scss" scoped>
li {
  list-style: none;
}
ul {
  padding-left: 0.5em;
  line-height: 1.5em;
}
.link {
  cursor: pointer;
}
</style>
