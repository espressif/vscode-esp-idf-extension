/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 24th February 2023 9:22:15 pm
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

import { ExtensionContext } from "vscode";
import { ESP } from "../config";

export class ExtensionConfigStore {
  private static self: ExtensionConfigStore;
  private ctx: ExtensionContext;

  public static init(context: ExtensionContext): ExtensionConfigStore {
    if (!this.self) {
      return new ExtensionConfigStore(context);
    }
    return this.self;
  }
  private constructor(context: ExtensionContext) {
    this.ctx = context;
  }
  public get<T>(key: string, defaultValue?: T): T {
    return this.ctx.globalState.get<T>(key, defaultValue);
  }
  public set(key: string, value: any) {
    this.ctx.globalState.update(key, value);
  }
  public clear(key: string) {
    return this.set(key, undefined);
  }

  public clearIdfSetup(key: string) {
    this.clear(key);
    let currSetups = this.getIdfSetupKeys();
    const idfSetupIndex = currSetups.findIndex((s) => s === key);
    if (idfSetupIndex === -1) {
      return;
    }
    currSetups.splice(idfSetupIndex, 1);
    this.updateIdfSetupKeys(currSetups);
  }

  public getIdfSetupKeys() {
    return this.ctx.globalState.get<string[]>(
      ESP.GlobalConfiguration.IDF_SETUPS,
      []
    );
  }

  public updateIdfSetupKeys(setupKeys: string[]) {
    this.ctx.globalState.update(ESP.GlobalConfiguration.IDF_SETUPS, setupKeys);
  }
}
