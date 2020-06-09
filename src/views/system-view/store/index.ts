// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Vue from "vue";
import Vuex, { ActionTree, MutationTree, StoreOptions } from "vuex";
import { layout } from "./plotLayout";

Vue.use(Vuex);

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
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

export interface IState {
  isLoading: boolean;
  rawData: any;
  plotData: any[];
  plotLayout: {};
  settings: SystemViewUISettings;
  eventsTable: string[][];
  contextInfoTable: string[][];
}

export const state: IState = {
  isLoading: true,
  rawData: undefined,
  plotData: [],
  plotLayout: layout,
  settings: {
    ContextInfoTableHeight: 150,
    ContextInfoTableVisible: true,

    EventsTableHeight: 150,
    EventsTableVisible: true,

    TimelineBarWidth: 10,
    TimelineContextSwitchLineColor: "#ffffff",
    TimelineHeight: 200,
    TimelineVisible: true,
  },
  eventsTable: [],
  contextInfoTable: [],
};

export const mutations: MutationTree<IState> = {
  setLoading(state, flag: boolean) {
    const newState = state;
    newState.isLoading = flag;
    Object.assign(state, newState);
  },
  setSVDATJSON(state, data: any) {
    const newState = state;
    newState.rawData = data;
    Object.assign(state, newState);
  },
  setPlotData(state, data: any[]) {
    const newState = state;
    newState.plotData = data;
    Object.assign(state, newState);
  },
  setEventsTable(state, data: string[][]) {
    const newState = state;
    newState.eventsTable = data;
    Object.assign(state, newState);
  },
  setContextInfoTable(state, data: string[][]) {
    const newState = state;
    newState.contextInfoTable = data;
    Object.assign(state, newState);
  },
};

export const actions: ActionTree<IState, any> = {};

export const systemViewStore: StoreOptions<IState> = {
  state,
  mutations,
  actions,
};

export const store = new Vuex.Store(systemViewStore);
