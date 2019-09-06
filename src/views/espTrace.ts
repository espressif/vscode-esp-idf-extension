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

import "./espTrace.scss";

import { relative } from "path";
import * as Plotly from "plotly.js-dist";
import Vue from "vue";
// @ts-ignore
import Tree from "./Tree.vue";
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

const allocLookupTable = {};
const eventIDs = { alloc: "", free: "", print: "" };
let callersAddressTranslationTable = {};

Vue.component("stack-trace", Tree);
// Vue App
const app = new Vue({
    el: "#app",
    data: {
        // tslint:disable-next-line: max-line-length
        subtitle: "App Tracing Reporter will help you with in-depth analysis of the runtime. In a nutshell this feature allows you to transfer arbitrary data between host and ESP32 via JTAG interface with small overhead on program execution.",
        title: "<strong>ESP-IDF</strong>&nbsp;App Tracing Reporter",
        fileName: "",
        traceType: 0,
        isCalculating: false,
        log: null,
        plot: false,
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
        pathInfo: {
            idfPath: "",
            workspacePath: "",
        },
        errorMsg: "",
    },
    methods: {
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
                // tslint:disable-next-line: no-console
                console.log("Tracing Type Not yet implemented");
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
        resolveAddress(addr: string): string {
            const stackInfo = callersAddressTranslationTable[addr];
            if (stackInfo && stackInfo.funcName) {
                return `${stackInfo.funcName}() - ${this.resolveAbsoluteFilePath(stackInfo.filePath)}:${stackInfo.lineNumber}`;
            }
            return addr;
        },
        createTreeFromAddressArray(addresses: string[]): object {
            let obj: any;
            let lastObj: any;
            const filteredAddresses = addresses.filter((value) => value !== "0x0");
            filteredAddresses.forEach((add: string, index: number) => {
                const address = this.resolveAddress(add);
                const lastElem = index + 1 === filteredAddresses.length ? true : false;
                if (!lastObj) {
                    obj = {};
                    obj.name = address;
                    if (!lastElem) {
                        obj.child = {};
                        lastObj = obj.child;
                    }
                } else {
                    lastObj.name = address;
                    if (!lastElem) {
                        lastObj.child = {};
                        lastObj = lastObj.child;
                    }
                }
            });
            return obj;
        },
    },
    mounted() {
        if (!this.loaded) {
            vscode.postMessage({
                command: "webviewLoad",
            });
        }
    },
});

const drawPlot = (data: any[], el: string) => {
    app.plot = true;
    setTimeout(() => {
        const layout = {
            yaxis: {
                fixedrange: false,
            },
            hovermode: "closest",
        };
        const chartProp = {
            displaylogo: false,
            scrollZoom: true,
            responsive: true,
        };
        Plotly.newPlot(el, data, layout, chartProp);

        const plot = document.getElementById(el) as any;
        plot.on("plotly_click", (d) => {
            app.tracePane = true;
            const index = d.points[0].pointIndex;
            const evt = Object.assign({}, d.points[0].data.evt[index]);
            app.traceInfo.type = evt.id === eventIDs.alloc ? "Allocated" : "Freed";
            app.traceInfo.task = evt.ctx_name;
            app.traceInfo.callers = evt.callers;
            app.traceInfo.addr = evt.addr;
            app.traceInfo.ts = evt.ts;
            if (evt.id === eventIDs.free) {
                const yaxis = d.points[0].data.y;
                app.traceInfo.size = index !== 0 ? yaxis[index - 1] - yaxis[index] : yaxis[index];
            } else if (evt.id === eventIDs.alloc) {
                app.traceInfo.size = evt.size;
            }
        });
    }, 0);
};

const updateModelWithTraceData = ({ trace }) => {
    if (trace) {
        app.fileName = trace.fileName;
        app.traceType = trace.type;
        app.pathInfo.idfPath = trace.idfPath;
        app.pathInfo.workspacePath = trace.workspacePath;

        app.isCalculating = false;
        app.log = null;
        app.plot = false;
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

const free = (size: number, time: number, index: number, evt: any, data: any[]) => {
    allocFree(size, time, index, data, evt, "f");
};

const alloc = (size: number, time: number, index: number, evt: any, data: any[]) => {
    allocFree(size, time, index, data, evt, "a");
};

const allocFree = (size: number, time: number, index: number, data: any[], evt: any, type: string) => {
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
    if (evt.id === eventIDs.free) { // FREE
        if (allocLookupTable[evt.addr]) {
            const index = allocLookupTable[evt.addr].index;
            const size = allocLookupTable[evt.addr].size;
            free(size, evt.ts, index, evt, data);
            delete allocLookupTable[evt.addr];
        }
    } else if (evt.id === eventIDs.alloc) { // ALLOC
        const index = getIndex(evt, data);
        allocLookupTable[evt.addr] = { index, size: evt.size };
        alloc(evt.size, evt.ts, index, evt, data);
    }
};

const traceExists = (evt: any, data: any[]): boolean => {
    return data.filter((d) => d.name === evt.ctx_name).length > 0;
};

const plotData = ({ plot }) => {
    if (plot && app.isCalculating) {

        if (plot.version && plot.version !== "1.0") {
            return app.displayError("Invalid tracing data received!");
        }

        app.isCalculating = false;
        eventIDs.alloc = plot.streams.heap.alloc;
        eventIDs.free = plot.streams.heap.free;
        eventIDs.print = plot.streams.log.print;

        const data = [];
        plot.events.forEach((evt: any) => {
            if (!traceExists(evt, data)) {
                data.push({
                    type: "scatter",
                    fill: "tozeroy",
                    name: evt.ctx_name,
                    x: [],
                    y: [],
                    evt: [],
                });
            }
            if (evt.callers) {
                evt.callers.forEach((caller) => {
                    callersAddressTranslationTable[caller] = {};
                });
            }
            injectDataToGraph(evt, data);
        });
        vscode.postMessage({
            command: "resolveAddresses",
            addresses: callersAddressTranslationTable,
        });
        if (data.length === 0) {
            return app.displayError("Tracing Data Received is Empty");
        }

        drawPlot(data, "plot");
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
            callersAddressTranslationTable = msg.value;
            break;
        default:
            break;
    }
});
