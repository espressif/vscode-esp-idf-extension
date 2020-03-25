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
.table thead th,
.table thead td {
  color: var(--vscode-foreground);
}
</style>

<script lang="ts">
import Vue from "vue";
export default Vue.extend({
  props: {
    persistentCount: Number,
    persistentBytes: Number,
    transientCount: Number,
    totalBytes: Number,
    totalCount: Number,
  },
});
</script>
