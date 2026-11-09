<script setup lang="ts">
import { computed, ref } from "vue";
import { filterHeapDetails, HeapDetailRow } from "../heapTraceModel";

const props = defineProps<{
  rows: HeapDetailRow[];
  selectedIndex: number | null;
}>();

const emit = defineEmits<{
  select: [row: HeapDetailRow];
}>();

type SortKey = "timestamp" | "kind" | "context" | "core" | "inIrq" | "size" | "address";

const leaksOnly = ref(false);
const sortKey = ref<SortKey>("timestamp");
const sortDirection = ref<1 | -1>(1);

const visibleRows = computed(() => {
  const filtered = filterHeapDetails(props.rows, leaksOnly.value);
  return [...filtered].sort((left, right) => compareRows(left, right));
});

const leakCount = computed(
  () => props.rows.filter((row) => row.possibleLeak).length
);

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "timestamp", label: "Time (s)" },
  { key: "kind", label: "Event" },
  { key: "context", label: "Context" },
  { key: "core", label: "Core" },
  { key: "inIrq", label: "IRQ" },
  { key: "size", label: "Size (bytes)" },
  { key: "address", label: "Address" },
];

function compareRows(left: HeapDetailRow, right: HeapDetailRow): number {
  const key = sortKey.value;
  const direction = sortDirection.value;
  if (key === "size" || key === "timestamp") {
    return (left[key] - right[key]) * direction;
  }
  if (key === "inIrq") {
    return (Number(left.inIrq) - Number(right.inIrq)) * direction;
  }
  return String(left[key]).localeCompare(String(right[key])) * direction;
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 1 ? -1 : 1;
    return;
  }
  sortKey.value = key;
  sortDirection.value = 1;
}

function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
  if (sortKey.value !== key) {
    return "none";
  }
  return sortDirection.value === 1 ? "ascending" : "descending";
}

function eventLabel(row: HeapDetailRow): string {
  if (row.possibleLeak) {
    return "Possible leak";
  }
  return row.kind === "alloc" ? "Allocated" : "Freed";
}

function rowClass(row: HeapDetailRow): string[] {
  const classes = ["heap-detail-row"];
  if (row.possibleLeak) {
    classes.push("heap-detail-leak");
  } else if (row.kind === "free") {
    classes.push("heap-detail-free");
  }
  if (props.selectedIndex === row.index) {
    classes.push("heap-detail-selected");
  }
  return classes;
}

function rowLabel(row: HeapDetailRow): string {
  const irq = row.inIrq ? "in IRQ" : "not in IRQ";
  return `${eventLabel(row)}, ${row.size} bytes at ${row.address}, context ${row.context}, ${irq}`;
}

function formatTimestamp(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function displayCore(core: string): string {
  return core === "" ? "-" : core;
}

function selectRow(row: HeapDetailRow) {
  emit("select", row);
}
</script>

<template>
  <div class="heap-details">
    <div class="heap-details-toolbar">
      <label class="heap-details-filter">
        <input type="checkbox" v-model="leaksOnly" />
        <span>Possible leaks only</span>
      </label>
      <p class="heap-details-summary">
        Showing {{ visibleRows.length }} of {{ rows.length }} events.
        {{ leakCount }} possible leak{{ leakCount === 1 ? "" : "s" }}.
      </p>
    </div>
    <p class="heap-details-legend">
      <span class="heap-details-swatch heap-detail-free">Freed</span>
      <span class="heap-details-swatch heap-detail-leak">Possible leak</span>
      Possible leaks are allocations that were still outstanding when the trace
      ended.
    </p>
    <p v-if="visibleRows.length === 0" class="heap-details-empty">
      {{
        leaksOnly
          ? "No possible leaks in this trace."
          : "No heap events in this trace."
      }}
    </p>
    <div v-else class="heap-details-scroll">
      <table class="heap-details-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :aria-sort="ariaSort(column.key)"
            >
              <button type="button" @click="toggleSort(column.key)">
                {{ column.label }}
                <span v-if="sortKey === column.key" aria-hidden="true">
                  {{ sortDirection === 1 ? "↑" : "↓" }}
                </span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleRows"
            :key="row.index"
            :class="rowClass(row)"
            :aria-label="rowLabel(row)"
            :aria-selected="selectedIndex === row.index"
            tabindex="0"
            @click="selectRow(row)"
            @keydown.enter.prevent="selectRow(row)"
          >
            <td>{{ formatTimestamp(row.timestamp) }}</td>
            <td>{{ eventLabel(row) }}</td>
            <td>{{ row.context }}</td>
            <td>{{ displayCore(row.core) }}</td>
            <td>{{ row.inIrq ? "Yes" : "No" }}</td>
            <td>{{ row.size.toLocaleString() }}</td>
            <td>
              <code>{{ row.address || "-" }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.heap-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.heap-details-toolbar,
.heap-details-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.heap-details-filter {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 13px;
}

.heap-details-summary,
.heap-details-legend,
.heap-details-empty {
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}

.heap-details-swatch {
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  color: var(--vscode-foreground);
}

.heap-details-scroll {
  overflow: auto;
  max-height: 60vh;
}

.heap-details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.heap-details-table th,
.heap-details-table td {
  padding: 0.35rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--vscode-settings-dropdownBorder);
  white-space: nowrap;
}

.heap-details-table th {
  position: sticky;
  top: 0;
  background: var(--vscode-editor-background);
  z-index: 1;
}

.heap-details-table button {
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.heap-detail-row {
  cursor: pointer;
}

.heap-detail-row:hover {
  background: var(--vscode-list-hoverBackground);
}

.heap-detail-row:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.heap-detail-free {
  background: rgba(137, 209, 133, 0.28);
}

.heap-detail-leak {
  background: rgba(204, 167, 0, 0.32);
}

.heap-detail-selected {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

code {
  font-family: var(--vscode-editor-font-family);
}
</style>
