/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 14th September 2023 12:05:50 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { relative } from "path";
import { defineStore } from "pinia";
import { computed, ref, Ref } from "vue";
import {
  analyzeHeapTrace,
  buildHeapPlotTraces,
  emptyHeapTraceAnalysis,
  eventMatchesHeapFilter,
  HeapDetailRow,
  HeapPlotTrace,
  HeapTraceAnalysis,
  HeapTraceEvent,
  HeapTraceSummary,
  TOTAL_SERIES_NAME,
} from "./heapTraceModel";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export enum TraceType {
  AppTrace = 0,
  HeapTrace = 1,
}
export interface TraceInfo {
  task: string;
  type: string;
  ts: number;
  addr: string;
  size: number;
  callers: string[];
  detailIndex?: number;
}

export interface StackInfo {
  address: string;
  child: StackInfo;
  filePath: string;
  funcName: string;
  lineNumber: string;
  count: number;
  size: number;
}

export interface TracingTree {
  name: string;
  description: string;
  filePath: string;
  lineNumber: string;
  count: number;
  size: number;
  child?: TracingTree;
}

const EMPTY_SUMMARY: HeapTraceSummary = emptyHeapTraceAnalysis().summary;

export const useTracingStore = defineStore("tracing", () => {
  const fileName: Ref<string> = ref("");
  const traceType: Ref<number> = ref(0);
  const isCalculating: Ref<boolean> = ref(false);
  const log: Ref<string> = ref("");
  const heap: Ref<boolean> = ref(false);
  const heapView: Ref<{
    stats: boolean;
    plot: boolean;
    details: boolean;
    callStack: boolean;
  }> = ref({
    stats: false,
    plot: true,
    details: false,
    callStack: false,
  });
  const eventIDs: Ref<{ alloc: string; free: string; print: string }> = ref({
    alloc: "",
    free: "",
    print: "",
  });
  const loaded: Ref<boolean> = ref(false);
  const tracePane: Ref<boolean> = ref(false);
  const traceInfo: Ref<TraceInfo> = ref({
    task: "",
    type: "",
    ts: 0,
    addr: "0xFF",
    size: 0,
    callers: [],
  });
  const callStacks: Ref<string[][]> = ref([]);
  const pathInfo: Ref<{ idfPath: string; workspacePath: string }> = ref({
    idfPath: "",
    workspacePath: "",
  });
  const errorMsg: Ref<string> = ref("");
  const dataPlot: Ref<HeapPlotTrace[]> = ref([]);
  const callersAddressTranslationTable: Ref<{}> = ref({});
  const plotDataReceived: Ref<{ events: HeapTraceEvent[] }> = ref({
    events: [],
  });
  const analysis: Ref<HeapTraceAnalysis> = ref(emptyHeapTraceAnalysis());
  const summary: Ref<HeapTraceSummary> = ref({ ...EMPTY_SUMMARY });
  const detailRows: Ref<HeapDetailRow[]> = ref([]);
  const contexts: Ref<string[]> = ref([]);
  const contextColors: Ref<Record<string, string>> = ref({});
  const contextVisibility: Ref<Record<string, boolean>> = ref({});
  const showTotal: Ref<boolean> = ref(true);
  const selectedDetailIndex: Ref<number | null> = ref(null);
  const plotRevision: Ref<number> = ref(0);

  const allContextsVisible = computed(
    () =>
      contexts.value.length > 0 &&
      contexts.value.every(
        (context) => contextVisibility.value[context] !== false
      )
  );

  function filterCallStacks(filter: string) {
    const next: string[][] = [];
    plotDataReceived.value.events.forEach((event) => {
      if (
        !event.callers ||
        !eventMatchesHeapFilter(event, filter, eventIDs.value)
      ) {
        return;
      }
      const callers = event.callers.filter((value) => value && value !== "0x0");
      if (callers.length > 0) {
        next.push(callers);
      }
    });
    callStacks.value = next;
  }

  function plotSelected(info: TraceInfo) {
    tracePane.value = true;
    traceInfo.value = info;
    selectedDetailIndex.value =
      typeof info.detailIndex === "number" ? info.detailIndex : null;
  }

  function selectDetail(row: HeapDetailRow) {
    plotSelected({
      task: row.context,
      type: row.kind === "alloc" ? "Allocated" : "Freed",
      ts: row.timestamp,
      addr: row.address,
      size: row.size,
      callers: row.callers,
      detailIndex: row.index,
    });
  }

  function callStackAddressTranslation(address: string, key: string) {
    if (
      callersAddressTranslationTable.value[address] &&
      callersAddressTranslationTable.value[address][key]
    ) {
      return callersAddressTranslationTable.value[address][key];
    }
    return "?";
  }

  function heapViewChange(buttonKey: string) {
    Object.keys(heapView.value).forEach((key) => {
      heapView.value[key] = key === buttonKey;
    });
  }

  function resetHeapReport() {
    analysis.value = emptyHeapTraceAnalysis();
    summary.value = { ...EMPTY_SUMMARY };
    detailRows.value = [];
    contexts.value = [];
    contextColors.value = {};
    contextVisibility.value = {};
    showTotal.value = true;
    selectedDetailIndex.value = null;
    dataPlot.value = [];
    callStacks.value = [];
    callersAddressTranslationTable.value = {};
    plotDataReceived.value = { events: [] };
    tracePane.value = false;
    log.value = "";
  }

  function showReport() {
    if (isCalculating.value) {
      return;
    }
    errorMsg.value = "";
    if (traceType.value === TraceType.HeapTrace) {
      resetHeapReport();
      isCalculating.value = true;
      vscode.postMessage({
        command: "calculateHeapTrace",
      });
    } else if (traceType.value === TraceType.AppTrace) {
      isCalculating.value = true;
      log.value = "";
      vscode.postMessage({
        command: "calculate",
      });
    } else {
      displayError("Tracing Type Not yet implemented");
      // tslint:disable-next-line: no-console
      console.error("Tracing Type Not yet implemented");
    }
  }

  function getInitialData() {
    if (!loaded.value) {
      vscode.postMessage({
        command: "webviewLoad",
      });
    }
  }

  function displayError(err: string) {
    setTimeout(() => {
      errorMsg.value = "";
    }, 5000);
    errorMsg.value = err;
  }

  function resolveAbsoluteFilePath(path: string): string {
    let relativePath = path;
    if (path.indexOf(pathInfo.value.workspacePath) !== -1) {
      relativePath = relative(pathInfo.value.workspacePath, path);
    } else if (path.indexOf(pathInfo.value.idfPath) !== -1) {
      relativePath = relative(pathInfo.value.idfPath, path);
    }
    return relativePath;
  }

  function resolveAddress(address: string) {
    const stackInfo: StackInfo = callersAddressTranslationTable.value[address];
    if (stackInfo) {
      return {
        address: stackInfo.funcName || address,
        filePath: stackInfo.filePath || "",
        lineNumber: stackInfo.lineNumber || "",
        count: stackInfo.count || 0,
        size: stackInfo.size || 0,
      };
    }
    return { address, filePath: "", lineNumber: "", count: 0, size: 0 };
  }

  function treeOpenFileHandler(filePath: string, lineNumber: number) {
    const command = "openFileAtLine";
    vscode.postMessage({
      command,
      filePath,
      lineNumber,
    });
  }

  function createTreeFromAddressArray(addresses: string[]) {
    const root: TracingTree = {
      name: "",
      description: "",
      filePath: "",
      lineNumber: "",
      count: 0,
      size: 0,
      child: null,
    } as TracingTree;
    let currObj: TracingTree;
    const filteredAddresses = addresses.filter((value) => value !== "0x0");
    filteredAddresses.forEach((add: string, index: number) => {
      const { address, filePath, lineNumber, count, size } = resolveAddress(
        add
      );
      const lastElem = index + 1 === filteredAddresses.length ? true : false;

      currObj = currObj ? currObj : root;
      currObj.name = address;
      currObj.description = `${resolveAbsoluteFilePath(
        filePath
      )}:${lineNumber}`;
      currObj.filePath = filePath;
      currObj.lineNumber = lineNumber;
      currObj.count = count;
      currObj.size = size;
      if (!lastElem) {
        currObj.child = {
          name: "",
          description: "",
          filePath: "",
          lineNumber: "",
          count: 0,
          size: 0,
          child: null,
        } as TracingTree;
        currObj = currObj.child;
      }
    });
    return root;
  }

  function refreshPlot() {
    dataPlot.value = buildHeapPlotTraces(analysis.value, {
      total: showTotal.value,
      contexts: contextVisibility.value,
    });
  }

  function setShowTotal(visible: boolean) {
    showTotal.value = visible;
    refreshPlot();
  }

  function setContextVisible(context: string, visible: boolean) {
    contextVisibility.value = {
      ...contextVisibility.value,
      [context]: visible,
    };
    refreshPlot();
  }

  function setAllContextsVisible(visible: boolean) {
    const next: Record<string, boolean> = {};
    contexts.value.forEach((context) => {
      next[context] = visible;
    });
    contextVisibility.value = next;
    refreshPlot();
  }

  function setTraceVisible(name: string, visible: boolean) {
    if (name === TOTAL_SERIES_NAME) {
      setShowTotal(visible);
      return;
    }
    setContextVisible(name, visible);
  }

  function updateModelWithTraceData({ trace }) {
    if (trace) {
      fileName.value = trace.fileName;
      traceType.value = trace.type;
      pathInfo.value.idfPath = trace.idfPath;
      pathInfo.value.workspacePath = trace.workspacePath;

      isCalculating.value = false;
      log.value = "";
      heap.value = false;
      loaded.value = true;
    }
  }

  function showLog(value: { log: string }) {
    if (value.log && isCalculating.value) {
      isCalculating.value = false;
      log.value = value.log;
    }
  }

  const calculateFailed = ({ error }) => {
    isCalculating.value = false;
    log.value = "";
    displayError(formatCalculationError(error));
  };

  function populateGlobalCallStackCountAndSize(value) {
    callersAddressTranslationTable.value = value;
    plotDataReceived.value.events.forEach((evt: HeapTraceEvent) => {
      if (evt.callers) {
        evt.callers.forEach((callAddr) => {
          if (!callersAddressTranslationTable.value[callAddr]) {
            callersAddressTranslationTable.value[callAddr] = {};
          }
          const callerAddressPtr =
            callersAddressTranslationTable.value[callAddr];
          if (!callerAddressPtr.size) {
            callersAddressTranslationTable.value[callAddr]["size"] = 0;
          }
          if (!callerAddressPtr.count) {
            callersAddressTranslationTable.value[callAddr]["count"] = 0;
          }

          callerAddressPtr.size += evt.size;
          callerAddressPtr.count += 1;
        });
      }
    });
  }

  function plotData(value: { plot }) {
    if (!value.plot || !isCalculating.value) {
      return;
    }
    if (value.plot.version && value.plot.version !== "1.0") {
      isCalculating.value = false;
      displayError("Invalid tracing data received!");
      return;
    }

    const nextAnalysis = analyzeHeapTrace(value.plot);
    if (nextAnalysis.details.length === 0) {
      isCalculating.value = false;
      displayError("Tracing Data Received is Empty");
      return;
    }

    plotDataReceived.value = value.plot;
    analysis.value = nextAnalysis;
    summary.value = nextAnalysis.summary;
    detailRows.value = nextAnalysis.details;
    contexts.value = nextAnalysis.contexts;
    contextColors.value = nextAnalysis.contextColors;
    contextVisibility.value = Object.fromEntries(
      nextAnalysis.contexts.map((context) => [context, true])
    );
    showTotal.value = true;
    selectedDetailIndex.value = null;
    plotRevision.value += 1;
    callStacks.value = nextAnalysis.callStacks.map((callers) => [...callers]);
    eventIDs.value.alloc = value.plot.streams.heap.alloc;
    eventIDs.value.free = value.plot.streams.heap.free;
    eventIDs.value.print = value.plot.streams.log?.print ?? "";

    const addressMap: Record<string, Record<string, never>> = {};
    nextAnalysis.callerAddresses.forEach((address) => {
      addressMap[address] = {};
    });
    callersAddressTranslationTable.value = addressMap;
    vscode.postMessage({
      command: "resolveAddresses",
      addresses: JSON.stringify(addressMap),
    });

    refreshPlot();
    heap.value = true;
    isCalculating.value = false;
  }

  return {
    allContextsVisible,
    analysis,
    callStackAddressTranslation,
    callStacks,
    calculateFailed,
    callersAddressTranslationTable,
    contextColors,
    contextVisibility,
    contexts,
    createTreeFromAddressArray,
    dataPlot,
    detailRows,
    displayError,
    errorMsg,
    eventIDs,
    fileName,
    filterCallStacks,
    getInitialData,
    heap,
    heapView,
    heapViewChange,
    isCalculating,
    loaded,
    log,
    pathInfo,
    plotData,
    plotRevision,
    plotSelected,
    populateGlobalCallStackCountAndSize,
    resolveAbsoluteFilePath,
    resolveAddress,
    selectDetail,
    selectedDetailIndex,
    setAllContextsVisible,
    setContextVisible,
    setShowTotal,
    setTraceVisible,
    showLog,
    showReport,
    showTotal,
    summary,
    traceInfo,
    tracePane,
    traceType,
    treeOpenFileHandler,
    updateModelWithTraceData,
  };
});

function formatCalculationError(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Heap trace calculation failed";
}
