/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 2nd June 2026 3:54:10 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { debug, ExtensionContext, window } from "vscode";
import { PeripheralTreeView } from "./svd/peripheralTreeView";
import { HexViewProvider } from "./hexViewProvider";
import { CDTDebugConfigurationProvider } from "./debugConfProvider";
import { CDTDebugAdapterDescriptorFactory } from "./server";
import {
  registerDebugSessionLifecycle,
  registerGdbTargetDebugAdapterTracker,
  registerLaunchJsonPortWatcher,
  registerPeripheralTreeView,
} from "./commands/registerDebugSubscriptions";
import {
  registerEspIdfDebugCommand,
  registerHexViewCommands,
  registerImageViewCommands,
} from "./commands/registerDebugAdapterCommands";

export async function registerDebugCommands(context: ExtensionContext) {
  const sessionFlags = {
    isOpenOCDLaunchedByDebug: { value: false },
    isDebugRestarted: { value: false },
  };

  const peripheralTreeProvider = new PeripheralTreeView();
  registerPeripheralTreeView(context, peripheralTreeProvider);

  const cdtDebugProvider = new CDTDebugConfigurationProvider();
  context.subscriptions.push(
    debug.registerDebugConfigurationProvider("gdbtarget", cdtDebugProvider)
  );

  const cdtDebugAdapterFactory = new CDTDebugAdapterDescriptorFactory();
  context.subscriptions.push(
    debug.registerDebugAdapterDescriptorFactory(
      "gdbtarget",
      cdtDebugAdapterFactory
    )
  );

  registerLaunchJsonPortWatcher(context, cdtDebugAdapterFactory);
  registerDebugSessionLifecycle(context, peripheralTreeProvider, sessionFlags);

  const hexViewProvider = new HexViewProvider();
  context.subscriptions.push(
    window.registerTreeDataProvider("espIdf.hexView", hexViewProvider)
  );

  registerGdbTargetDebugAdapterTracker(
    context,
    peripheralTreeProvider,
    hexViewProvider,
    sessionFlags.isDebugRestarted
  );

  registerHexViewCommands(context, hexViewProvider);
  registerImageViewCommands(context);
  registerEspIdfDebugCommand(context, cdtDebugProvider);
}
