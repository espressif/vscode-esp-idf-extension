<script setup lang="ts">
import { TracingTree, useTracingStore } from "../store";

defineProps<{
  tree: TracingTree;
}>();

let isOpen = false;

const store = useTracingStore();

function toggle() {
  isOpen = !isOpen;
}

function openFileAtLine(filePath: string, lineNumber: string) {
  const matches = lineNumber.match(/[0-9]*/);
  if (matches && matches.length) {
    const lineNumberInt = parseInt(matches[0]);
    store.treeOpenFileHandler(filePath, lineNumberInt);
  }
}
</script>

<template>
  <li>
    <div>
      <span class="link" @click="toggle" v-if="tree.child">{{
        isOpen ? "▼" : "▶"
      }}</span>
      <span v-else>&nbsp;&nbsp;&nbsp;&nbsp;</span>
      <strong>{{ tree.name }}</strong>
      <span v-if="tree.filePath !== '' && tree.lineNumber !== ''">
        <span>&nbsp;-&nbsp;</span>
        <a href="#" @click="openFileAtLine(tree.filePath, tree.lineNumber)">{{
          tree.description
        }}</a>
      </span>
    </div>
    <ul v-show="isOpen" v-if="tree.child">
      <Tree v-bind:tree="tree.child"></Tree>
    </ul>
  </li>
</template>

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
