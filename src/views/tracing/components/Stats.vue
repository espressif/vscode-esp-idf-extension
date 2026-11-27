<script setup lang="ts">
defineProps<{
  persistentCount: Number;
  persistentBytes: Number;
  transientCount: Number;
  totalBytes: Number;
  totalCount: Number;
}>();
</script>

<template>
  <table
    class="table is-fullwidth is-hoverable is-size-7-mobile is-size-6-tablet is-size-5-desktop"
  >
    <thead>
      <tr>
        <th>Name</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Persistent Count</td>
        <td>{{ persistentCount }}</td>
      </tr>
      <tr>
        <td>Persistent Bytes</td>
        <td>{{ persistentBytes }}</td>
      </tr>
      <tr>
        <td>Transient Count</td>
        <td>{{ transientCount }}</td>
      </tr>
      <tr>
        <td>Total Bytes</td>
        <td>{{ totalBytes }}</td>
      </tr>
      <tr>
        <td>Total Count</td>
        <td>{{ totalCount }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style lang="scss" scoped>
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
</style>
