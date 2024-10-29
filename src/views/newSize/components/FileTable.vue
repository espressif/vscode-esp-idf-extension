<script setup lang="ts">
import { computed, onMounted, ref, Ref } from "vue";
import { IDFSizeArchive } from "../../../espIdf/size/types";

const props = defineProps<{
  archiveInfo: IDFSizeArchive;
}>();

let tableHeaders: Ref<string[]> = ref([]);

let tableData: Ref<{ [key: string]: number | string }[]> = ref([]);

let tableHeadersAbbrev: Ref<{ [key: string]: string }> = ref({});

function generateTableData() {
  const columnSet: Set<string> = new Set();
  for (const fileName in props.archiveInfo.files) {
    const fileData = props.archiveInfo.files[fileName];
    const memoryTypes = fileData.memory_types;

    for (const memoryType in memoryTypes) {
      columnSet.add(`${memoryType}`);
      const sections = memoryTypes[memoryType].sections;

      for (const section in sections) {
        const columnKey = `${memoryTypes[memoryType].sections[section].abbrev_name}`;
        tableHeadersAbbrev.value[section] = columnKey;
        columnSet.add(`${section}`);
      }
    }
  }
  const columns = Array.from(columnSet);

  for (const fileName in props.archiveInfo.files) {
    const fileData = props.archiveInfo.files[fileName];
    const memoryTypes = fileData.memory_types;
    const row: { [key: string]: number | string } = {
      "Object File": fileName,
      "Total Size": fileData.size,
    };

    columns.forEach((col) => {
      row[col] = 0;
    });

    for (const memoryType in memoryTypes) {
      row[`${memoryType}`] = memoryTypes[memoryType].size;
      for (const section in memoryTypes[memoryType].sections) {
        row[section] = memoryTypes[memoryType].sections[section].size;
      }
    }
    tableData.value.push(row);
  }
  tableHeaders.value = ["Object File", "Total Size", ...Array.from(columnSet)];
}

onMounted(() => {
  console.log(props.archiveInfo.files);
  generateTableData();
});
</script>

<template>
  <table
    class="table is-striped is-fullwidth is-hoverable is-size-7-mobile is-size-7-tablet is-size-6-desktop"
  >
    <thead>
      <tr class="is-uppercase">
        <td v-for="(header, i) in tableHeaders" :key="i" class="has-text-right">
          {{ tableHeadersAbbrev[header] ? tableHeadersAbbrev[header] : header }}
        </td>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in tableData" :key="rowIndex">
        <td
          v-for="(header, colIndex) in tableHeaders"
          :key="colIndex"
          class="has-text-right"
        >
          {{ row[header] }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
