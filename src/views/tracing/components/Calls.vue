<template>
  <div class="calls">
    <div class="columns">
      <div class="column is-2">Size00x</div>
      <div class="column is-2">Count00y</div>
      <div class="column is-2">
        <span v-html="spaces"></span>
        <span class="link" @click="toggle" v-if="tree.child">{{ isOpen ? '▼' : '▶' }}</span>
        <span v-else>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <strong>{{tree.name}}</strong>
      </div>
    </div>
    <div v-show="isOpen" v-if="tree.child">
      <Calls v-bind:tree="tree.child" v-bind:space="space+1"></Calls>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
const Calls = Vue.extend({
  name: "Calls",
  props: {
    tree: Object,
    space: Number
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
*{
  font-size: 12px;
}
.link {
  cursor: pointer;
}
.columns{
  margin: 0 auto;
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: var(--vscode-foreground);
}
.column{
  padding: 0.3rem;
}
</style>
