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

import * as Plotly from "plotly.js";
import Vue from "vue";

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
        const layout = {};
        Plotly.newPlot(el, data, layout, { displaylogo: false });

        const plot = document.getElementById(el);
        plot.addEventListener("plotly_click", (evt: any) => {
            const index = evt.points[0].pointIndex;
            // tslint:disable-next-line: no-console
            console.log(evt.points[0].data.evt[index]);
        });
    }, 0);
};

const updateModelWithTraceData = ({ trace }) => {
    if (trace) {
        app.fileName = trace.fileName;
        app.isCalculating = false;
        app.traceType = trace.type;
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

const allocLookupTable = {};
const eventIDs = { alloc: "", free: "", print: "" };

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
            injectDataToGraph(evt, data);
        });
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
        default:
            break;
    }
});
