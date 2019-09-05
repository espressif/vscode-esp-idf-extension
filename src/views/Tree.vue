<template>
  <li>
    <div class="link">
      <span @click="toggle" v-if="tree.child">{{ isOpen ? '▼' : '▶' }}</span>
      <span v-else>&nbsp;&nbsp;&nbsp;&nbsp;</span>
      {{ tree.name }}
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
  font-weight: bold;
  cursor: pointer;
}
</style>
