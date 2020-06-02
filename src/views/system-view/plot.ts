import * as Plotly from "plotly.js-dist";
import {
  SysViewEvent,
  LookUpTable,
  IGNORE_RENDER_SYS_STREAM_LIST,
} from "../../espIdf/tracing/system-view/model";

export const layout = {
  height: 200,
  margin: {
    t: 30,
    b: 30,
    r: 20,
  },
  paper_bgcolor: undefined,
  plot_bgcolor: undefined,
  font: {
    color: undefined,
    size: 8,
  },
  hovermode: "closest",
  showlegend: false,
  dragmode: "pan",
  xaxis: {
    range: [0, 0.01],
    // rangeslider: { range: [range.xmin, range.xmax] },
    showspikes: true,
    spikemode: "across",
    spikedash: "solid",
    spikecolor: undefined,
    spikethickness: 0.5,
  },
  yaxis: {
    title: "Core 0",
    domain: [0.5, 1],
    fixedrange: true,
    showgrid: false,
    zeroline: false,
    showline: false,
  },
  yaxis2: {
    title: "Core 1",
    domain: [0, 0.49],
    fixedrange: true,
    showgrid: false,
    zeroline: false,
    showline: false,
  },
  spikedistance: 200,
  hoverdistance: 10,
  grid: {
    rows: 2,
    columns: 1,
    subplots: [["xy"], ["xy2"]],
  },
};

export function setLayoutFromCSS(style: CSSStyleDeclaration) {
  const bgColor = style.getPropertyValue("--vscode-editor-background");
  const fontColor = style.getPropertyValue("--vscode-editor-foreground");
  layout.paper_bgcolor = bgColor;
  layout.plot_bgcolor = bgColor;
  layout.xaxis.spikecolor = fontColor;
  layout.font.color = fontColor;
}

export function drawPlot(mcore: any) {
  const IGNORE_RENDER_SYS_STREAM_ID_LIST = new Set(
    IGNORE_RENDER_SYS_STREAM_LIST.map((name) => mcore.streams.system[name])
  );

  const lookupTable = generateLookupTable(mcore.events as SysViewEvent[]);

  const range = calculateAndInjectDataPoints(
    mcore.events as SysViewEvent[],
    lookupTable,
    IGNORE_RENDER_SYS_STREAM_ID_LIST,
    mcore.streams.system["SYS_OVERFLOW"]
  );

  layout.xaxis.range = [range.xmin, 0.01];

  const plotData = populatePlotData(lookupTable);

  return plotData;
}

function generateLookupTable(events: SysViewEvent[]): LookUpTable {
  const lookupTable: LookUpTable = {};

  events.forEach((evt: SysViewEvent) => {
    if (!lookupTable[evt.core_id]) {
      lookupTable[evt.core_id] = {
        irq: {},
        ctx: {},
        lastEvent: null,
        contextSwitch: {
          name: "context-switch",
          line: {
            color: "#555555",
            width: 0.5,
          },
          mode: "lines",
          opacity: 0.7,
          type: "scatterql",
          x: [],
          y: [],
          xaxis: "x",
          yaxis: evt.core_id === 1 ? "y2" : "y",
          // visible: "legendonly",
          hoverinfo: "skip",
        },
      };
    }

    if (
      evt.in_irq === true &&
      !lookupTable[evt.core_id].irq.hasOwnProperty(evt.ctx_name)
    ) {
      lookupTable[evt.core_id].irq[evt.ctx_name] = {};
    } else if (
      evt.in_irq === false &&
      !lookupTable[evt.core_id].ctx.hasOwnProperty(evt.ctx_name)
    ) {
      lookupTable[evt.core_id].ctx[evt.ctx_name] = {};
    }
  });

  return lookupTable;
}

function calculateAndInjectDataPoints(
  events: SysViewEvent[],
  lookupTable: LookUpTable,
  ignoreRenderIds: Set<number>,
  sysOverflowId: number
): { xmin: number; xmax: number } {
  function drawContextSwitch(
    coreId: number,
    previousYAxis: any,
    currentYAxis: any,
    commonXAxis: any
  ) {
    if (previousYAxis === currentYAxis) {
      return;
    }
    const contextSwitch = lookupTable[coreId].contextSwitch;
    contextSwitch.x.push(commonXAxis, commonXAxis, null);
    contextSwitch.y.push(previousYAxis, currentYAxis, null);
  }
  function stopLastEventBar(coreId: number, stopTimeStamp: number) {
    const previousEvt = lookupTable[coreId].lastEvent;
    if (!previousEvt) {
      return;
    }
    const previousData =
      previousEvt.in_irq === true
        ? lookupTable[coreId].irq[previousEvt.ctx_name]
        : lookupTable[coreId].ctx[previousEvt.ctx_name];

    //stop for last event
    previousData.x.push(stopTimeStamp, null);
    previousData.y.push(previousData.name, null);
  }

  const range = {
    xmin: Number.POSITIVE_INFINITY,
    xmax: Number.NEGATIVE_INFINITY,
  };

  events.forEach((evt: SysViewEvent) => {
    //Ignore the list of ignored System Events
    if (ignoreRenderIds.has(evt.id)) {
      return;
    }
    //SYS_OVERFLOW event halt all the running tasks and draw void rect
    if (evt.id === sysOverflowId) {
      console.log("Halt event arrived", evt);
      //halts both the tasks running on both the core
      stopLastEventBar(0, evt.ts);
      stopLastEventBar(1, evt.ts);

      //set previous event as null for both core
      lookupTable[0].lastEvent = null;
      lookupTable[1].lastEvent = null;

      //ignore everything else and continue like a fresh start
      return;
    }
    if (evt.ts >= range.xmax) {
      range.xmax = evt.ts;
    }
    if (evt.ts <= range.xmin) {
      range.xmin = evt.ts;
    }

    let data = lookupTable[evt.core_id].ctx[evt.ctx_name];
    if (evt.in_irq === true) {
      data = lookupTable[evt.core_id].irq[evt.ctx_name];
    }

    if (!data.type) {
      data.type = "scattergl";
      data.mode = "lines";
      data.opacity = 1;
      data.line = { width: 10 };
      data.name = evt.in_irq === true ? `IRQ: ${evt.ctx_name}` : evt.ctx_name;
      if (evt.core_id === 1) {
        data.yaxis = "y2";
        data.xaxis = "x";
      }
      data.y = [];
      data.x = [];
    }
    //stop the last event bar (if exists)
    stopLastEventBar(evt.core_id, evt.ts);

    //draw context switch
    const previousEvt = lookupTable[evt.core_id].lastEvent;
    if (previousEvt) {
      const previousData =
        previousEvt.in_irq === true
          ? lookupTable[evt.core_id].irq[previousEvt.ctx_name]
          : lookupTable[evt.core_id].ctx[previousEvt.ctx_name];
      drawContextSwitch(evt.core_id, previousData.name, data.name, evt.ts);
    }

    //start point for current evt
    data.x.push(evt.ts);
    data.y.push(data.name);

    //store current event for a core as last event for the same core
    lookupTable[evt.core_id].lastEvent = evt;
  });
  return range;
}

function colorPlot(lookupTable: LookUpTable): Map<string, string> {
  //@ts-ignore
  const colorGenerator = Plotly.d3.scale.category20();
  const colorMap = new Map();
  let i = 0;
  function applyColorFor(obj: Object) {
    Object.keys(obj).forEach((v) => {
      if (!colorMap.has(v)) {
        if (v === "scheduler") {
          colorMap.set(v, "#000000");
        } else if (v.match(/^IDLE[0-9]*/)) {
          colorMap.set(v, "#ffd4ff");
        } else {
          colorMap.set(v, colorGenerator(i++));
        }
      }
    });
  }
  Object.keys(lookupTable).forEach((coreId) => {
    applyColorFor(lookupTable[coreId].ctx);
    applyColorFor(lookupTable[coreId].irq);
  });
  return colorMap;
}

function populatePlotData(lookupTable: LookUpTable): Array<any> {
  /**
   * Plot Population Strategy
   * IRQ1
   * ...
   * IRQN
   * -----------------------------
   * Scheduler
   * -----------------------------
   * Tasks1
   * ...
   * TasksN
   * -----------------------------
   * IDLE
   */
  const plotData = [];
  const colorPlotMap = colorPlot(lookupTable);
  Object.keys(lookupTable).forEach((coreId) => {
    const cpuCore = lookupTable[coreId];

    const taskPriorityList = new Set<string>();
    const contextNames = new Set<string>(Object.keys(cpuCore.ctx));

    contextNames.forEach((name) => {
      if (name.match(/^IDLE[0-9]*/)) {
        taskPriorityList.add(name);
        contextNames.delete(name);
      }
    });

    contextNames.forEach((name) => {
      if (name !== "scheduler") {
        taskPriorityList.add(name);
        contextNames.delete(name);
      }
    });

    if (contextNames.has("scheduler")) {
      taskPriorityList.add("scheduler");
      contextNames.delete("scheduler");
    }

    taskPriorityList.forEach((name) => {
      const color = colorPlotMap.get(name);
      const evt = cpuCore.ctx[name];
      if (color && evt.mode === "lines") {
        evt.line.color = color;
      }
      plotData.push(evt);
    });

    Object.keys(cpuCore.irq).forEach((irq) => {
      const color = colorPlotMap.get(irq);
      const evt = cpuCore.irq[irq];
      if (color && evt.mode === "lines") {
        evt.line.color = color;
      }
      plotData.push(evt);
    });

    plotData.push(cpuCore.contextSwitch);
  });
  return plotData;
}
