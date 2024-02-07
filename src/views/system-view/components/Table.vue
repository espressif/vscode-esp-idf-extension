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
  color: var(--vscode-editor-foreground);
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

.table td,
.table th {
  border-color: var(--vscode-sideBarSectionHeader-border);
}

.table thead td,
.table thead th {
  color: var(--vscode-editor-foreground);
}
table {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}
.table.is-hoverable tbody tr:not(.is-selected):hover {
  background-color: var(--vscode-sideBar-dropBackground);
}
</style>
