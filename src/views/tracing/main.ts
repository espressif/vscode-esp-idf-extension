/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 11th July 2019 11:16:46 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import "./index.scss";

import { relative } from "path";
import Vue from "vue";
// @ts-ignore
import Calls from "./components/Calls.vue";
// @ts-ignore
import CallStack from "./components/CallStack.vue";
// @ts-ignore
import LeakList from "./components/LeakList.vue";
// @ts-ignore
import Plot from "./components/Plot.vue";
// @ts-ignore
import QuickActionMenu from "./components/QuickActionMenu.vue";
// @ts-ignore
import QuickCallStack from "./components/QuickCallStack.vue";
// @ts-ignore
import Tree from "./components/Tree.vue";
// @ts-ignore
import Stats from "./components/Stats.vue";
declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

enum TraceType {
  AppTrace = 0,
  HeapTrace = 1,
}

let plotDataReceived = {} as any;

Vue.component("stack-trace", Tree);
Vue.component("call-stack", CallStack);
Vue.component("calls", Calls);
Vue.component("plot", Plot);
Vue.component("quick-call-stack", QuickCallStack);
Vue.component("quick-action-menu", QuickActionMenu);
Vue.component("leak-list", LeakList);
Vue.component("stats-view", Stats);
// Vue App
const app = new Vue({
  el: "#app",
  data: {
    // tslint:disable-next-line: max-line-length
    subtitle:
      "App Tracing Reporter will help you with in-depth analysis of the runtime. In a nutshell this feature allows you to transfer arbitrary data between host and ESP32 via JTAG interface with small overhead on program execution.",
    title: "<strong>ESP-IDF</strong>&nbsp;App Tracing Reporter",
    fileName: "",
    traceType: 0,
    isCalculating: false,
    log: null,
    heap: false,
    heapView: {
      stats: false,
      plot: true,
      callStack: false,
      leaks: false,
    },
    eventIDs: { alloc: "", free: "", print: "" },
    loaded: false,
    tracePane: false,
    traceInfo: {
      task: "",
      type: "",
      ts: 0,
      addr: "0xFF",
      size: 0,
      callers: [],
    },
    callStacks: [],
    pathInfo: {
      idfPath: "",
      workspacePath: "",
    },
    errorMsg: "",
    plotData: [],
    callersAddressTranslationTable: {},
    allocLookupTable: {},
  },
  methods: {
    filterCallStacks(filter: string) {
      const callStack = [];
      plotDataReceived.events.forEach((event) => {
        if (event.callers) {
          let shallAdd = false;
          switch (filter) {
            case "all":
              shallAdd = true;
              break;
            case "allocations":
              shallAdd = event.id === this.eventIDs.alloc;
              break;
            case "free":
              shallAdd = event.id === this.eventIDs.free;
              break;
            case "irq-all":
              shallAdd = event.in_irq;
              break;
            case "irq-allocations":
              shallAdd = event.in_irq && event.id === this.eventIDs.alloc;
              break;
            case "irq-free":
              shallAdd = event.in_irq && event.id === this.eventIDs.free;
              break;
            default:
              break;
          }
          if (shallAdd) {
            callStack.push(event.callers.filter((value) => value !== "0x0"));
          }
        }
      });
      this.callStacks = callStack;
    },
    plotSelected(info) {
      this.tracePane = true;
      this.traceInfo = info;
    },
    callStackAddressTranslation(address: string, key: string) {
      if (
        app.callersAddressTranslationTable[address] &&
        app.callersAddressTranslationTable[address][key]
      ) {
        return app.callersAddressTranslationTable[address][key];
      }
      return "?";
    },
    heapViewChange(buttonKey: string) {
      Object.keys(this.heapView).forEach((key) => {
        if (key === buttonKey) {
          this.$set(this.heapView, key, true);
          return;
        }
        this.$set(this.heapView, key, false);
      });
    },
    showReport() {
      if (this.traceType === TraceType.HeapTrace) {
        this.isCalculating = !this.isCalculating;
        vscode.postMessage({
          command: "calculateHeapTrace",
        });
      } else if (this.traceType === TraceType.AppTrace) {
        this.isCalculating = !this.isCalculating;
        vscode.postMessage({
          command: "calculate",
        });
      } else {
        this.displayError(`Tracing Type Not yet implemented`);
        // tslint:disable-next-line: no-console
        console.error("Tracing Type Not yet implemented");
      }
    },
    displayError(err: string) {
      setTimeout(() => {
        this.errorMsg = "";
      }, 5000);
      this.errorMsg = err;
    },
    resolveAbsoluteFilePath(path: string): string {
      let relativePath = path;
      if (path.indexOf(this.pathInfo.workspacePath) !== -1) {
        relativePath = relative(this.pathInfo.workspacePath, path);
      } else if (path.indexOf(this.pathInfo.idfPath) !== -1) {
        relativePath = relative(this.pathInfo.idfPath, path);
      }
      return relativePath;
    },
    resolveAddress(address: string): object {
      const stackInfo = app.callersAddressTranslationTable[address];
      if (stackInfo) {
        return {
          address: stackInfo.funcName || address,
          filePath: stackInfo.filePath || "",
          lineNumber: stackInfo.lineNumber || "",
          count: stackInfo.count || "",
          size: stackInfo.size || "",
        };
      }
      return { address, filePath: "", lineNumber: "", count: "", size: "" };
    },
    treeOpenFileHandler(filePath: string, lineNumber: number) {
      const command = "openFileAtLine";
      vscode.postMessage({
        command,
        filePath,
        lineNumber,
      });
    },
    createTreeFromAddressArray(addresses: string[]): object {
      const root = {};
      let currObj: any;
      const filteredAddresses = addresses.filter((value) => value !== "0x0");
      filteredAddresses.forEach((add: string, index: number) => {
        const {
          address,
          filePath,
          lineNumber,
          count,
          size,
        } = this.resolveAddress(add);
        const lastElem = index + 1 === filteredAddresses.length ? true : false;

        currObj = currObj ? currObj : root;
        currObj.name = address;
        currObj.description = `${this.resolveAbsoluteFilePath(
          filePath
        )}:${lineNumber}`;
        currObj.filePath = filePath;
        currObj.lineNumber = lineNumber;
        currObj.count = count;
        currObj.size = size;
        if (!lastElem) {
          currObj.child = {};
          currObj = currObj.child;
        }
      });
      return root;
    },
  },
  mounted() {
    if (!this.loaded) {
      vscode.postMessage({
        command: "webviewLoad",
      });
    }
  },
  computed: {
    persistentBytes() {
      //amount of allocated memory that hasn’t been freed yet
      return Object.keys(this.allocLookupTable).reduce(
        (acc: any, currentKey: string) =>
          acc + this.allocLookupTable[currentKey].size,
        0
      );
    },
    persistentCount() {
      //number of allocations that haven’t been freed yet
      return Object.keys(this.allocLookupTable).length;
    },
    transientCount() {
      //total number of memory allocations that have been freed
      if (!plotDataReceived) {
        return 0;
      }
      return (
        plotDataReceived.events.filter(
          (event: any) => event.id === this.eventIDs.alloc
        ).length - this.persistentCount
      );
    },
    totalBytes() {
      //total allocated memory
      if (!plotDataReceived) {
        return 0;
      }
      return plotDataReceived.events
        .filter((event: any) => event.id === this.eventIDs.alloc)
        .reduce((acc: any, current: any) => acc + current.size, 0);
    },
    totalCount() {
      return this.persistentCount + this.transientCount;
    },
  },
});

const drawPlot = (data: any[]) => {
  app.heap = true;
  app.plotData = data;
};

const updateModelWithTraceData = ({ trace }) => {
  if (trace) {
    app.fileName = trace.fileName;
    app.traceType = trace.type;
    app.pathInfo.idfPath = trace.idfPath;
    app.pathInfo.workspacePath = trace.workspacePath;

    app.isCalculating = false;
    app.log = null;
    app.heap = false;
    app.loaded = true;
  }
};

const showLog = ({ log }) => {
  if (log && app.isCalculating) {
    app.isCalculating = false;
    app.log = log;
  }
};

const calculateFailed = ({ error }) => {
  if (error) {
    app.isCalculating = false;
    app.log = null;
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

const injectDataToGraph = (evt: any, data: any[]) => {
  if (evt.id === app.eventIDs.free) {
    // FREE
    if (app.allocLookupTable[evt.addr]) {
      const index = app.allocLookupTable[evt.addr].index;
      const size = app.allocLookupTable[evt.addr].size;
      free(size, evt.ts, index, evt, data);
      delete app.allocLookupTable[evt.addr];
    }
  } else if (evt.id === app.eventIDs.alloc) {
    // ALLOC
    const index = getIndex(evt, data);
    app.allocLookupTable[evt.addr] = { index, size: evt.size, evt };
    alloc(evt.size, evt.ts, index, evt, data);
  }
};

const traceExists = (evt: any, data: any[]): boolean => {
  return data.filter((d) => d.name === evt.ctx_name).length > 0;
};

const computeTotalScatterLine = (plot: any, data: any[]) => {
  const store = {};
  const totalPlot = {
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
        value.id === app.eventIDs.alloc || value.id === app.eventIDs.free
    )
    .forEach((e) => {
      let finalSize = 0;
      if (e.id === app.eventIDs.alloc) {
        finalSize = e.size;
      } else if (e.id === app.eventIDs.free) {
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

const populateGlobalCallStackCountAndSize = (value) => {
  app.callersAddressTranslationTable = value;
  plotDataReceived.events.forEach((evt: any) => {
    if (evt.callers) {
      evt.callers.forEach((callAddr) => {
        if (!app.callersAddressTranslationTable[callAddr]) {
          app.callersAddressTranslationTable[callAddr] = {};
        }
        const callerAddressPtr = app.callersAddressTranslationTable[callAddr];
        if (!callerAddressPtr.size) {
          Vue.set(app.callersAddressTranslationTable[callAddr], "size", 0);
        }
        if (!callerAddressPtr.count) {
          Vue.set(app.callersAddressTranslationTable[callAddr], "count", 0);
        }

        callerAddressPtr.size += evt.size;
        callerAddressPtr.count += 1;
      });
    }
  });
};

const plotData = ({ plot }) => {
  if (plot && app.isCalculating) {
    if (plot.version && plot.version !== "1.0") {
      return app.displayError("Invalid tracing data received!");
    }

    plotDataReceived = plot;

    app.isCalculating = false;
    app.eventIDs.alloc = plot.streams.heap.alloc;
    app.eventIDs.free = plot.streams.heap.free;
    app.eventIDs.print = plot.streams.log.print;

    const data = [];
    plot.events.forEach((evt: any) => {
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
          app.callersAddressTranslationTable[caller] = {};
        });
        app.callStacks.push(evt.callers.filter((value) => value !== "0x0"));
      }
      injectDataToGraph(evt, data);
    });
    if (data.length === 0) {
      return app.displayError("Tracing Data Received is Empty");
    }
    vscode.postMessage({
      command: "resolveAddresses",
      addresses: app.callersAddressTranslationTable,
    });
    computeTotalScatterLine(plot, data);
    drawPlot(data);
  }
};

// Message Receiver
declare var window: any;
window.addEventListener("message", (m: any) => {
  const msg = m.data;
  switch (msg.command) {
    case "initialLoad":
      updateModelWithTraceData(msg.value);
      break;
    case "calculated":
      showLog(msg.value);
      break;
    case "calculatedHeapTrace":
      plotData(msg.value);
      break;
    case "calculateFailed":
      calculateFailed(msg.value);
      break;
    case "addressesResolved":
      populateGlobalCallStackCountAndSize(msg.value);
      break;
    default:
      break;
  }
});
