<script setup lang="ts">
defineProps<{
  name: string;
  height: number;
}>();
</script>

<template>
  <div>
    <p>{{ name }}</p>
    <div class="table-container" :style="{ 'max-height': height + 'px' }">
      <table class="table is-fullwidth is-hoverable">
        <thead>
          <tr>
            <slot name="th"></slot>
          </tr>
        </thead>
        <tbody>
          <slot name="tr"></slot>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
p {
  color: var(--vscode-foreground);
}
.table-container {
  max-height: 150px;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 0;
}
thead {
  font-size: var(--vscode-font-size);
}

tbody {
  font-size: var(--vscode-editor-font-size);
}
tr {
  cursor: pointer;
}

.table {
  --bulma-table-color: var(--vscode-foreground);
  --bulma-table-background-color: transparent;
  --bulma-table-cell-background-color: transparent;
  --bulma-table-cell-border-color: var(--vscode-panel-border);
  --bulma-table-head-cell-color: var(--vscode-foreground);
  --bulma-table-head-background-color: transparent;
  --bulma-table-row-hover-background-color: var(--vscode-list-hoverBackground);
  background-color: transparent;
  color: var(--vscode-foreground);
}

.table td,
.table th {
  color: var(--vscode-foreground);
  background-color: transparent;
  border-color: var(--vscode-panel-border);
}

.table.is-hoverable tbody tr:not(.is-selected):hover {
  background-color: var(--vscode-list-hoverBackground);
}
</style>
