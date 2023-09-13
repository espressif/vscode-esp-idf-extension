/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 13th September 2023 9:52:01 am
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

export interface SystemViewUISettings {
  TimelineBarWidth: number;
  TimelineHeight: number;
  TimelineContextSwitchLineColor: string;
  TimelineVisible: boolean;

  EventsTableVisible: boolean;
  EventsTableHeight: number;

  ContextInfoTableVisible: boolean;
  ContextInfoTableHeight: number;
}

export interface eventTableRow {
  tr: any[];
  st: number;
  end: number;
}

export const useSystemViewStore = defineStore("system-view", () => {
  let isLoading: Ref<boolean> = ref(true);
  let rawData: Ref<any> = ref(undefined);
  let plotData: Ref<any[]> = ref([]);
  let plotLayout: Ref<{}> = ref({});
  let settings: Ref<SystemViewUISettings> = ref({
    ContextInfoTableHeight: 150,
    ContextInfoTableVisible: true,

    EventsTableHeight: 150,
    EventsTableVisible: true,

    TimelineBarWidth: 10,
    TimelineContextSwitchLineColor: "#555555",
    TimelineHeight: 200,
    TimelineVisible: true,
  });
  let eventsTable: Ref<eventTableRow[]> = ref([]);
  let contextInfoTable: Ref<string[][]> = ref([]);

  return {
    contextInfoTable,
    eventsTable,
    isLoading,
    plotData,
    plotLayout,
    rawData,
    settings,
  };
});
