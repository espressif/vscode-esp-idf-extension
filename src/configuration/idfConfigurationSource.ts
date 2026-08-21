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

import {
  ConfigurationScope,
  ConfigurationTarget,
  workspace,
} from "vscode";

/** Minimal shape used by checkTypeOfConfiguration */
export type IdfInspectResult = {
  defaultValue?: unknown;
};

/**
 * Seams VS Code workspace configuration reads/writes used by configuration/idf.ts.
 * Production uses {@link vscodeIdfConfigurationSource}; tests may replace via
 * {@link setIdfConfigurationSource} / {@link resetIdfConfigurationSource}.
 */
export interface IdfConfigurationSource {
  getScoped(
    section: string,
    scope: ConfigurationScope | undefined,
    key: string
  ): unknown;
  inspectGlobal(key: string): IdfInspectResult | undefined;
  updateScoped(
    section: string,
    scope: ConfigurationScope | undefined,
    key: string,
    value: unknown,
    target: ConfigurationTarget
  ): Thenable<void>;
  updateGlobal(
    key: string,
    value: unknown,
    target: ConfigurationTarget
  ): Thenable<void>;
  refreshConfiguration(): void;
}

export const vscodeIdfConfigurationSource: IdfConfigurationSource = {
  getScoped(section, scope, key) {
    return workspace.getConfiguration(section, scope).get(key);
  },
  inspectGlobal(key) {
    return workspace.getConfiguration().inspect(key);
  },
  updateScoped(section, scope, key, value, target) {
    return workspace.getConfiguration(section, scope).update(key, value, target);
  },
  updateGlobal(key, value, target) {
    return workspace.getConfiguration().update(key, value, target);
  },
  refreshConfiguration() {
    workspace.getConfiguration("");
  },
};

let activeSource: IdfConfigurationSource = vscodeIdfConfigurationSource;

export function getIdfConfigurationSource(): IdfConfigurationSource {
  return activeSource;
}

/** Intended for tests; extension activate resets to the VS Code implementation. */
export function setIdfConfigurationSource(source: IdfConfigurationSource): void {
  activeSource = source;
}

export function resetIdfConfigurationSource(): void {
  activeSource = vscodeIdfConfigurationSource;
}
