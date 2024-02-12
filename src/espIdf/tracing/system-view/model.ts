/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th May 2020 11:52:03 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

export interface eventsParams {
  desc?: string;
  cpu_freq?: number;
  id_shift?: number;
  ram_base?: number;
  sys_freq?: number;
  base?: number;
  sz?: number;
  tid?: number;
  unused?: number;

  time?: number;
  name?: string;
  prio?: number;

  mod_cnt?: number;
  irq_num?: number;
  pvItemToQueue?: number;
  xCopyPosition?: number;
  xQueue?: number;
  xTicksToWait?: number;
  xTicksToDelay?: number;
  cause?: number;
  evt_off?: number;
  mod_id?: number;
  ucQueueType?: number;
  uxItemSize?: number;
  uxQueueLength?: number;
  pvBuffer?: number;
  xJustPeek?: number;
  xTaskToDelete?: number;
}

export interface events {
  ctx_name?: string;
  id?: number;
  core_id?: number;
  ts?: number;
  in_irq?: boolean;
  params?: eventsParams;
}

export interface SysViewEvent extends events {
  // plot related meta info
  type?: string;
  mode?: string;
  opacity?: number;
  line?: { width?: number; color?: string };
  name?: string;
  yaxis?: string;
  xaxis?: string;
  x?: Array<any>;
  y?: Array<any>;
}
export type SysViewEventObjects = {
  [key: string]: SysViewEvent;
};

export interface LookUpTable {
  [key: string]: {
    irq: SysViewEventObjects;
    ctx: SysViewEventObjects;
    lastEvent: SysViewEvent | null;
    contextSwitch: {
      line: { width: number; color: string };
      opacity: number;
      type: "scatterql";
      x: Array<number | null>;
      y: Array<string | null>;
      xaxis?: "x";
      yaxis?: "y" | "y2";
      mode: "lines";
      name: "context-switch";
      visible?: "legendonly";
      hoverinfo: "skip";
    };
  };
}
export const IGNORE_RENDER_SYS_STREAM_LIST = [
  "SYS_INIT",
  "SYS_MODULEDESC",
  "SYS_NAME_RESOURCE",
  "SYS_NOP",
  "SYS_NUMMODULES",
  "SYS_STACK_INFO",
  "SYS_SYSDESC",
  "SYS_SYSTIME_CYCLES",
  "SYS_SYSTIME_US",
  "SYS_TRACE_START",
  "SYS_TRACE_STOP",
  "SYS_TASK_INFO",
];
