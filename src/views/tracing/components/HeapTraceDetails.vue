<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  CallerSymbol,
  filterHeapDetails,
  HeapDetailRow,
  topCallerFrame,
} from "../heapTraceModel";
import { useTracingStore } from "../store";

const props = defineProps<{
  rows: HeapDetailRow[];
  selectedIndex: number | null;
  symbols?: Record<string, CallerSymbol>;
}>();

const store = useTracingStore();

const emit = defineEmits<{
  select: [row: HeapDetailRow];
}>();

type SortKey =
  | "timestamp"
  | "kind"
  | "function"
  | "context"
  | "core"
  | "inIrq"
  | "size"
  | "address";

const PAGE_SIZE = 100;

const leaksOnly = ref(false);
const functionQuery = ref("");
const sortKey = ref<SortKey>("timestamp");
const sortDirection = ref<1 | -1>(1);
const page = ref(1);

const symbolMap = computed(() => {
  const map: Record<string, CallerSymbol> = {};
  const symbols = props.symbols ?? {};
  Object.keys(symbols).forEach((address) => {
    const symbol = symbols[address] ?? {};
    map[address] = {
      funcName: symbol.funcName,
      filePath: symbol.filePath
        ? store.resolveAbsoluteFilePath(symbol.filePath).replace(/\\/g, "/")
        : "",
      lineNumber: symbol.lineNumber,
    };
  });
  return map;
});

const visibleRows = computed(() => {
  const filtered = filterHeapDetails(
    props.rows,
    leaksOnly.value,
    functionQuery.value,
    symbolMap.value
  );
  return [...filtered].sort((left, right) => compareRows(left, right));
});

const pageCount = computed(() =>
  Math.max(1, Math.ceil(visibleRows.value.length / PAGE_SIZE))
);

const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return visibleRows.value.slice(start, start + PAGE_SIZE);
});

const pageStart = computed(() =>
  visibleRows.value.length === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1
);

const pageEnd = computed(() =>
  Math.min(page.value * PAGE_SIZE, visibleRows.value.length)
);

function pageForSelection(): number {
  if (props.selectedIndex === null) {
    return 1;
  }
  const position = visibleRows.value.findIndex(
    (row) => row.index === props.selectedIndex
  );
  if (position < 0) {
    return 1;
  }
  return Math.floor(position / PAGE_SIZE) + 1;
}

watch(
  () =>
    [
      leaksOnly.value,
      functionQuery.value,
      sortKey.value,
      sortDirection.value,
      props.rows,
    ] as const,
  () => {
    page.value = pageForSelection();
  }
);

watch(
  () => props.selectedIndex,
  () => {
    if (props.selectedIndex === null) {
      return;
    }
    page.value = pageForSelection();
  }
);

const leakCount = computed(
  () => props.rows.filter((row) => row.possibleLeak).length
);

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "timestamp", label: "Time (s)" },
  { key: "kind", label: "Event" },
  { key: "function", label: "Function" },
  { key: "context", label: "Context" },
  { key: "core", label: "Core" },
  { key: "inIrq", label: "IRQ" },
  { key: "size", label: "Size (bytes)" },
  { key: "address", label: "Address" },
];

const emptyMessage = computed(() => {
  const hasQuery = functionQuery.value.trim().length > 0;
  if (hasQuery && leaksOnly.value) {
    return "No possible leaks match this function.";
  }
  if (hasQuery) {
    return "No events match this function.";
  }
  if (leaksOnly.value) {
    return "No possible leaks in this trace.";
  }
  return "No heap events in this trace.";
});

function frameFor(row: HeapDetailRow) {
  return topCallerFrame(row, symbolMap.value);
}

function compareRows(left: HeapDetailRow, right: HeapDetailRow): number {
  const key = sortKey.value;
  const direction = sortDirection.value;
  if (key === "function") {
    return frameFor(left).name.localeCompare(frameFor(right).name) * direction;
  }
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
  const frame = frameFor(row);
  const functionName = frame.name || "unknown function";
  return `${eventLabel(row)}, ${row.size} bytes at ${row.address}, ${functionName}, context ${row.context}, ${irq}`;
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

function showPreviousPage() {
  page.value = Math.max(1, page.value - 1);
}

function showNextPage() {
  page.value = Math.min(pageCount.value, page.value + 1);
}
</script>

<template>
  <div class="heap-details">
    <div class="heap-details-toolbar">
      <label class="heap-details-filter">
        <input type="checkbox" v-model="leaksOnly" />
        <span>Possible leaks only</span>
      </label>
      <input
        class="heap-details-search"
        type="search"
        v-model="functionQuery"
        placeholder="Search function name"
        aria-label="Search function name"
      />
      <p class="heap-details-summary">
        Showing {{ pageStart }}–{{ pageEnd }} of {{ visibleRows.length }} events.
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
      {{ emptyMessage }}
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
            v-for="row in pagedRows"
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
            <td class="heap-detail-function">
              <span class="heap-detail-function-name">{{
                frameFor(row).name || "-"
              }}</span>
              <span
                v-if="frameFor(row).location"
                class="heap-detail-function-location"
              >
                {{ frameFor(row).location }}
              </span>
            </td>
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
    <div v-if="pageCount > 1" class="heap-details-pager">
      <button type="button" :disabled="page === 1" @click="showPreviousPage">
        Previous
      </button>
      <span>Page {{ page }} of {{ pageCount }}</span>
      <button
        type="button"
        :disabled="page === pageCount"
        @click="showNextPage"
      >
        Next
      </button>
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

.heap-details-search {
  height: 24px;
  min-width: 16rem;
  padding: 0 8px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 2px;
  font: inherit;
  font-size: 12px;
}

.heap-details-search:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
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

.heap-details-table td.heap-detail-function {
  white-space: normal;
  min-width: 12rem;
}

.heap-detail-function-name {
  font-weight: 600;
}

.heap-detail-function-location {
  display: block;
  color: var(--vscode-descriptionForeground);
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

.heap-details-pager {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 12px;
}

.heap-details-pager button {
  height: 24px;
  padding: 0 8px;
  background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
  color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

.heap-details-pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

code {
  font-family: var(--vscode-editor-font-family);
}
</style>
