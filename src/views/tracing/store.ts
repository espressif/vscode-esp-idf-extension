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
import { ref, Ref } from "vue";

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

export const useTracingStore = defineStore("tracing", () => {
  const fileName: Ref<string> = ref("");
  const traceType: Ref<number> = ref(0);
  const isCalculating: Ref<boolean> = ref(false);
  const log: Ref<string> = ref("");
  const heap: Ref<boolean> = ref(false);
  const heapView: Ref<{
    stats: boolean;
    plot: boolean;
    callStack: boolean;
    leaks: boolean;
  }> = ref({
    stats: false,
    plot: true,
    callStack: false,
    leaks: false,
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
  const callStacks: Ref<any[]> = ref([]);
  const pathInfo: Ref<{ idfPath: string; workspacePath: string }> = ref({
    idfPath: "",
    workspacePath: "",
  });
  const errorMsg: Ref<string> = ref("");
  const dataPlot: Ref<string[]> = ref([]);
  const callersAddressTranslationTable: Ref<{}> = ref({});
  const allocLookupTable: Ref<{}> = ref({});

  const plotDataReceived: Ref<{ events: any[] }> = ref({ events: [] });

  function filterCallStacks(filter: string) {
    plotDataReceived.value.events.forEach((event) => {
      if (event.callers) {
        let shallAdd = false;
        switch (filter) {
          case "all":
            shallAdd = true;
            break;
          case "allocations":
            shallAdd = event.id === eventIDs.value.alloc;
            break;
          case "free":
            shallAdd = event.id === eventIDs.value.free;
            break;
          case "irq-all":
            shallAdd = event.in_irq;
            break;
          case "irq-allocations":
            shallAdd = event.in_irq && event.id === eventIDs.value.alloc;
            break;
          case "irq-free":
            shallAdd = event.in_irq && event.id === eventIDs.value.free;
            break;
          default:
            break;
        }
        if (shallAdd) {
          callStacks.value.push(
            event.callers.filter((value) => value !== "0x0")
          );
        }
      }
    });
  }

  function plotSelected(info: TraceInfo) {
    console.log(info);
    tracePane.value = true;
    traceInfo.value = info;
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
      if (key === buttonKey) {
        heapView.value[key] = true;
        return;
      }
      heapView.value[key] = false;
    });
  }

  function showReport() {
    if (traceType.value === TraceType.HeapTrace) {
      isCalculating.value = !isCalculating.value;
      vscode.postMessage({
        command: "calculateHeapTrace",
      });
    } else if (traceType.value === TraceType.AppTrace) {
      isCalculating.value = !isCalculating.value;
      vscode.postMessage({
        command: "calculate",
      });
    } else {
      displayError(`Tracing Type Not yet implemented`);
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

  function drawPlot(data: any[]) {
    heap.value = true;
    dataPlot.value = data;
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
    if (error) {
      isCalculating.value = false;
      log.value = "";
    }
  };

  const free = (
    size: number,
    time: number,
    index: number,
    evt: any,
    data: any[]
  ) => {
    allocFree(size, time, index, data, evt, "f");
  };

  const alloc = (
    size: number,
    time: number,
    index: number,
    evt: any,
    data: any[]
  ) => {
    allocFree(size, time, index, data, evt, "a");
  };

  const allocFree = (
    size: number,
    time: number,
    index: number,
    data: any[],
    evt: any,
    type: string
  ) => {
    let currentValue: number;
    if (data[index].y.length === 0) {
      currentValue = 0;
    } else {
      currentValue = data[index].y[data[index].y.length - 1];
    }
    if (type === "a") {
      data[index].y.push(currentValue + size);
    } else if (type === "f") {
      data[index].y.push(currentValue - size);
    }
    data[index].x.push(time);
    data[index].evt.push(evt);
  };

  const getIndex = (evt: any, data: any[]) => {
    let index = -1;
    data.forEach((d, i) => {
      if (d.name === evt.ctx_name) {
        index = i;
      }
    });
    return index;
  };

  function injectDataToGraph(evt: any, data: any[]) {
    if (evt.id === eventIDs.value.free) {
      // FREE
      if (allocLookupTable.value[evt.addr]) {
        const index = allocLookupTable.value[evt.addr].index;
        const size = allocLookupTable.value[evt.addr].size;
        free(size, evt.ts, index, evt, data);
        delete allocLookupTable.value[evt.addr];
      }
    } else if (evt.id === eventIDs.value.alloc) {
      // ALLOC
      const index = getIndex(evt, data);
      allocLookupTable.value[evt.addr] = { index, size: evt.size, evt };
      alloc(evt.size, evt.ts, index, evt, data);
    }
  }

  function traceExists(evt: any, data: any[]) {
    return data.filter((d) => d.name === evt.ctx_name).length > 0;
  }

  const computeTotalScatterLine = (plot: any, data: any[]) => {
    const store: { [key: string]: number } = {};
    const totalPlot: {
      type: string;
      name: string;
      x: number[];
      y: number[];
      visible: string;
    } = {
      type: "scatter",
      name: "Total Memory",
      x: [],
      y: [],
      visible: "legendonly",
    };
    const evt = plot.events;
    evt
      .filter(
        (value: any) =>
          value.id === eventIDs.value.alloc || value.id === eventIDs.value.free
      )
      .forEach((e) => {
        let finalSize = 0;
        if (e.id === eventIDs.value.alloc) {
          finalSize = e.size;
        } else if (e.id === eventIDs.value.free) {
          finalSize = -e.size;
        }
        store[e.ts] = store[e.ts] ? store[e.ts] + finalSize : finalSize;
      });
    Object.keys(store)
      .sort()
      .forEach((ts, index) => {
        totalPlot.x.push(parseFloat(ts));
        const yPush =
          index === 0 ? store[ts] : totalPlot.y[index - 1] + store[ts];
        totalPlot.y.push(yPush);
      });
    data.push(totalPlot);
  };

  function populateGlobalCallStackCountAndSize(value) {
    callersAddressTranslationTable.value = value;
    plotDataReceived.value.events.forEach((evt: any) => {
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
    if (value.plot && isCalculating.value) {
      if (value.plot.version && value.plot.version !== "1.0") {
        return displayError("Invalid tracing data received!");
      }

      plotDataReceived.value = value.plot;

      isCalculating.value = false;
      eventIDs.value.alloc = value.plot.streams.heap.alloc;
      eventIDs.value.free = value.plot.streams.heap.free;
      eventIDs.value.print = value.plot.streams.log.print;

      const data: any[] = [];
      value.plot.events.forEach((evt: any) => {
        if (!traceExists(evt, data)) {
          data.push({
            line: {
              shape: "hv",
            },
            fill: "tozeroy",
            name: evt.ctx_name,
            x: [],
            y: [],
            evt: [],
            clickable: true,
          });
        }
        if (evt.callers) {
          evt.callers.forEach((caller) => {
            callersAddressTranslationTable[caller] = {};
          });
          callStacks.value.push(evt.callers.filter((value) => value !== "0x0"));
        }
        injectDataToGraph(evt, data);
      });
      if (data.length === 0) {
        return displayError("Tracing Data Received is Empty");
      }
      vscode.postMessage({
        command: "resolveAddresses",
        addresses: JSON.stringify(callersAddressTranslationTable),
      });
      computeTotalScatterLine(value.plot, data);
      drawPlot(data);
    }
  }

  return {
    dataPlot,
    fileName,
    traceType,
    isCalculating,
    log,
    heap,
    heapView,
    errorMsg,
    eventIDs,
    loaded,
    tracePane,
    traceInfo,
    callStacks,
    pathInfo,
    plotDataReceived,
    callersAddressTranslationTable,
    allocLookupTable,
    alloc,
    allocFree,
    callStackAddressTranslation,
    calculateFailed,
    computeTotalScatterLine,
    createTreeFromAddressArray,
    displayError,
    drawPlot,
    filterCallStacks,
    free,
    getIndex,
    getInitialData,
    heapViewChange,
    injectDataToGraph,
    populateGlobalCallStackCountAndSize,
    plotData,
    plotSelected,
    resolveAbsoluteFilePath,
    resolveAddress,
    traceExists,
    treeOpenFileHandler,
    showLog,
    showReport,
    updateModelWithTraceData,
  };
});
