/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const TOTAL_SERIES_NAME = "Total Memory";
export const TOTAL_SERIES_COLOR = "#4FC1FF";

const CONTEXT_COLORS = [
  "#89d185",
  "#cca700",
  "#f14c4c",
  "#b180d7",
  "#ce9178",
  "#dcdcaa",
  "#4ec9b0",
  "#d16969",
];

const EMPTY_CALLER = "0x0";

export interface HeapTraceEvent {
  id?: string | number;
  ts?: number;
  ctx_name?: string;
  size?: number;
  addr?: string | number;
  callers?: string[];
  in_irq?: boolean;
  core_id?: string | number;
}

export interface HeapTraceInput {
  streams?: {
    heap?: {
      alloc?: string | number;
      free?: string | number;
    };
    log?: {
      print?: string | number;
    };
  };
  events?: HeapTraceEvent[];
}

export interface HeapTraceIds {
  alloc: string | number;
  free: string | number;
}

export type HeapEventKind = "alloc" | "free";

export interface HeapDetailRow {
  index: number;
  timestamp: number;
  kind: HeapEventKind;
  context: string;
  core: string;
  inIrq: boolean;
  size: number;
  address: string;
  callers: string[];
  possibleLeak: boolean;
}

export interface PlotPointDetail {
  detailIndex: number;
  kind: HeapEventKind;
  context: string;
  timestamp: number;
  address: string;
  size: number;
  callers: string[];
}

export interface HeapPlotTrace {
  type: "scatter";
  mode: "lines";
  name: string;
  x: number[];
  y: number[];
  details: PlotPointDetail[];
  customdata: Array<[string, number, string]>;
  clickable: boolean;
  fill?: "tozeroy";
  line: { shape: "hv"; color: string; width: number };
  hovertemplate: string;
  visible: boolean;
}

export interface HeapContextSeries {
  context: string;
  color: string;
  x: number[];
  y: number[];
  details: PlotPointDetail[];
}

export interface HeapTraceSummary {
  persistentCount: number;
  persistentBytes: number;
  transientCount: number;
  totalBytes: number;
  totalCount: number;
}

export interface HeapTraceAnalysis {
  contexts: string[];
  contextColors: Record<string, string>;
  series: HeapContextSeries[];
  total: HeapContextSeries;
  details: HeapDetailRow[];
  leaks: HeapDetailRow[];
  summary: HeapTraceSummary;
  callStacks: string[][];
  callerAddresses: string[];
}

interface OpenAllocation {
  size: number;
  context: string;
  detailIndex: number;
}

interface ContextLedger {
  context: string;
  color: string;
  bytes: number;
  x: number[];
  y: number[];
  details: PlotPointDetail[];
}

const EMPTY_SUMMARY: HeapTraceSummary = {
  persistentCount: 0,
  persistentBytes: 0,
  transientCount: 0,
  totalBytes: 0,
  totalCount: 0,
};

export function emptyHeapTraceAnalysis(): HeapTraceAnalysis {
  return {
    contexts: [],
    contextColors: {},
    series: [],
    total: {
      context: TOTAL_SERIES_NAME,
      color: TOTAL_SERIES_COLOR,
      x: [],
      y: [],
      details: [],
    },
    details: [],
    leaks: [],
    summary: { ...EMPTY_SUMMARY },
    callStacks: [],
    callerAddresses: [],
  };
}

export function analyzeHeapTrace(plot: HeapTraceInput): HeapTraceAnalysis {
  const allocId = plot.streams?.heap?.alloc;
  const freeId = plot.streams?.heap?.free;
  if (allocId === undefined || freeId === undefined) {
    return emptyHeapTraceAnalysis();
  }

  const analysis = emptyHeapTraceAnalysis();
  const openAllocations = new Map<string, OpenAllocation>();
  const ledgers = new Map<string, ContextLedger>();
  const callerAddresses = new Set<string>();
  let totalBytes = 0;
  let allocatedBytes = 0;
  let allocationCount = 0;

  const ordered = (plot.events ?? [])
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        timestampOf(left.event) - timestampOf(right.event) ||
        left.index - right.index
    );

  ordered.forEach(({ event }) => {
    const callers = callerFrames(event);
    if (callers.length > 0) {
      analysis.callStacks.push([...callers]);
      callers.forEach((caller) => callerAddresses.add(caller));
    }

    const kind = eventKind(event, allocId, freeId);
    if (!kind) {
      return;
    }

    const context = contextName(event);
    const timestamp = timestampOf(event);
    const address = addressOf(event);
    const detail: HeapDetailRow = {
      index: analysis.details.length,
      timestamp,
      kind,
      context,
      core: coreOf(event),
      inIrq: Boolean(event.in_irq),
      size: 0,
      address,
      callers,
      possibleLeak: false,
    };

    if (kind === "alloc") {
      const size = numericSize(event.size);
      detail.size = size;
      detail.possibleLeak = true;
      allocationCount += 1;
      allocatedBytes += size;
      totalBytes += size;
      if (address) {
        openAllocations.set(address, {
          size,
          context,
          detailIndex: detail.index,
        });
      }
      const ledger = ledgerFor(ledgers, context);
      ledger.bytes += size;
      appendPoint(ledger, timestamp, ledger.bytes, detail);
      appendPoint(analysis.total, timestamp, totalBytes, detail);
    } else {
      const open = address ? openAllocations.get(address) : undefined;
      if (!open) {
        detail.size = numericSize(event.size);
        analysis.details.push(detail);
        return;
      }
      openAllocations.delete(address);
      analysis.details[open.detailIndex].possibleLeak = false;
      detail.size = open.size;
      totalBytes -= open.size;
      // Credit the context that allocated the block, even if another task frees it.
      const owner = ledgers.get(open.context);
      if (owner) {
        owner.bytes -= open.size;
        appendPoint(owner, timestamp, owner.bytes, detail);
      }
      appendPoint(analysis.total, timestamp, totalBytes, detail);
    }

    analysis.details.push(detail);
  });

  analysis.series = Array.from(ledgers.values()).map((ledger) => ({
    context: ledger.context,
    color: ledger.color,
    x: ledger.x,
    y: ledger.y,
    details: ledger.details,
  }));
  analysis.contexts = analysis.series.map((series) => series.context);
  analysis.contextColors = Object.fromEntries(
    analysis.series.map((series) => [series.context, series.color])
  );
  analysis.leaks = analysis.details.filter((row) => row.possibleLeak);
  analysis.summary = {
    persistentCount: analysis.leaks.length,
    persistentBytes: analysis.leaks.reduce((sum, row) => sum + row.size, 0),
    transientCount: allocationCount - analysis.leaks.length,
    totalBytes: allocatedBytes,
    totalCount: allocationCount,
  };
  analysis.callerAddresses = Array.from(callerAddresses);
  return analysis;
}

export function filterHeapDetails(
  rows: HeapDetailRow[],
  leaksOnly: boolean
): HeapDetailRow[] {
  if (!leaksOnly) {
    return rows;
  }
  return rows.filter((row) => row.possibleLeak);
}

export function eventMatchesHeapFilter(
  event: HeapTraceEvent,
  filter: string,
  ids: HeapTraceIds
): boolean {
  const kind = eventKind(event, ids.alloc, ids.free);
  switch (filter) {
    case "all":
      return true;
    case "allocations":
      return kind === "alloc";
    case "free":
      return kind === "free";
    case "irq-all":
      return Boolean(event.in_irq);
    case "irq-allocations":
      return Boolean(event.in_irq) && kind === "alloc";
    case "irq-free":
      return Boolean(event.in_irq) && kind === "free";
    default:
      return false;
  }
}

export interface HeapPlotVisibility {
  total: boolean;
  contexts: Record<string, boolean>;
}

export function buildHeapPlotTraces(
  analysis: HeapTraceAnalysis,
  visibility: HeapPlotVisibility
): HeapPlotTrace[] {
  const traces: HeapPlotTrace[] = [];
  if (analysis.total.x.length > 0) {
    traces.push(
      toTrace(analysis.total, TOTAL_SERIES_COLOR, visibility.total, "tozeroy")
    );
  }
  analysis.series.forEach((series) => {
    traces.push(
      toTrace(
        series,
        series.color,
        visibility.contexts[series.context] !== false
      )
    );
  });
  return traces;
}

function toTrace(
  series: HeapContextSeries,
  color: string,
  visible: boolean,
  fill?: "tozeroy"
): HeapPlotTrace {
  return {
    type: "scatter",
    mode: "lines",
    name: series.context,
    x: series.x,
    y: series.y,
    details: series.details,
    customdata: series.details.map((detail) => [
      detail.kind === "alloc" ? "Allocated" : "Freed",
      detail.size,
      detail.address,
    ]),
    clickable: true,
    fill,
    line: { shape: "hv", color, width: 2 },
    hovertemplate:
      "%{customdata[0]} %{customdata[1]} bytes @ %{customdata[2]}<br>%{x} s<br>%{y} bytes used<extra>%{fullData.name}</extra>",
    visible,
  };
}

function appendPoint(
  series: { x: number[]; y: number[]; details: PlotPointDetail[] },
  timestamp: number,
  bytes: number,
  row: HeapDetailRow
) {
  series.x.push(timestamp);
  series.y.push(bytes);
  series.details.push({
    detailIndex: row.index,
    kind: row.kind,
    context: row.context,
    timestamp,
    address: row.address,
    size: row.size,
    callers: row.callers,
  });
}

function ledgerFor(
  ledgers: Map<string, ContextLedger>,
  context: string
): ContextLedger {
  const existing = ledgers.get(context);
  if (existing) {
    return existing;
  }
  const created: ContextLedger = {
    context,
    color: CONTEXT_COLORS[ledgers.size % CONTEXT_COLORS.length],
    bytes: 0,
    x: [],
    y: [],
    details: [],
  };
  ledgers.set(context, created);
  return created;
}

function eventKind(
  event: HeapTraceEvent,
  allocId: string | number,
  freeId: string | number
): HeapEventKind | undefined {
  if (sameId(event.id, allocId)) {
    return "alloc";
  }
  if (sameId(event.id, freeId)) {
    return "free";
  }
  return undefined;
}

function sameId(
  eventId: string | number | undefined,
  streamId: string | number
): boolean {
  return eventId === streamId || String(eventId) === String(streamId);
}

function timestampOf(event: HeapTraceEvent): number {
  const timestamp = typeof event.ts === "number" ? event.ts : Number(event.ts);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function contextName(event: HeapTraceEvent): string {
  const name = event.ctx_name?.trim();
  return name ? name : "unknown";
}

function addressOf(event: HeapTraceEvent): string {
  if (event.addr === undefined || event.addr === null) {
    return "";
  }
  return String(event.addr);
}

function coreOf(event: HeapTraceEvent): string {
  if (
    event.core_id === undefined ||
    event.core_id === null ||
    event.core_id === ""
  ) {
    return "";
  }
  return String(event.core_id);
}

function numericSize(value: unknown): number {
  const size = typeof value === "number" ? value : Number(value);
  return Number.isFinite(size) ? size : 0;
}

function callerFrames(event: HeapTraceEvent): string[] {
  if (!Array.isArray(event.callers)) {
    return [];
  }
  return event.callers.filter((caller) => caller && caller !== EMPTY_CALLER);
}
