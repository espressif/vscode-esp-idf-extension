<script setup lang="ts">
import { computed, onMounted, ref, Ref } from "vue";
import { TracingTree, useTracingStore } from "../store";

const props = defineProps<{
  tree: TracingTree;
  space: number;
  total: number;
}>();

let isOpen: Ref<boolean> = ref(false);

const callRef = ref();

const store = useTracingStore();

const spaces = computed(() => {
  return new Array(props.space).join("&nbsp;&nbsp;&nbsp;&nbsp;");
});

function collapseAndExpandAll(isExpand: boolean) {
  if (props.tree.child) {
    isOpen.value = isExpand;
  }
  if (callRef && callRef.value && callRef.value.collapseAndExpandAll) {
    callRef.value.collapseAndExpandAll(isExpand);
  }
}

defineExpose({
  collapseAndExpandAll,
});

function toggle() {
  if (props.tree.child) {
    isOpen.value = !isOpen.value;
  }
}
function percentage() {
  const percentageStr = `(${Math.ceil(
    (props.tree.size / props.total) * 100
  ).toFixed(2)}%)`;
  return percentageStr === "(0.00%)" ? "" : percentageStr;
}
function openFileAtLine(filePath: string, lineNumber: string) {
  let lineNumMatches = lineNumber.match(/[0-9]*/);
  if (lineNumMatches && lineNumMatches.length) {
    const lineNumberInt = parseInt(lineNumMatches[0]);
    store.treeOpenFileHandler(filePath, lineNumberInt);
  }
}

onMounted(() => {
  console.log(props.tree);
})
</script>

<template>
  <div class="calls">
    <div class="columns">
      <div class="column is-2">
        {{ tree.size }}
        &nbsp;
        <span class="is-pulled-right is-hidden-mobile">
          {{ percentage() }}
          &nbsp;&nbsp;
        </span>
      </div>
      <div class="column is-2">{{ tree.count }}</div>
      <div class="column">
        <span v-html="spaces"></span>
        <span class="link" @click="toggle" v-if="tree.child">{{
          isOpen ? "▼" : "▶"
        }}</span>
        <span v-else>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <strong>{{ tree.name }}</strong>
        <span class="is-pull-right">
          <template v-if="tree.filePath !== '' && tree.lineNumber !== ''">
            <a
              href="#"
              @click="openFileAtLine(tree.filePath, tree.lineNumber)"
              >{{ tree.description }}</a
            >
          </template>
          <template v-else>{{
            tree.description !== ":" ? `(${tree.description})` : ""
          }}</template>
        </span>
      </div>
    </div>
    <div v-show="isOpen" v-if="tree.child">
      <Calls
        ref="callRef"
        v-bind:tree="tree.child"
        v-bind:space="space + 1"
        :total="total"
      ></Calls>
    </div>
  </div>
</template>

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
