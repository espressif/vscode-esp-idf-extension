/*
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

import {
  debug,
  DebugConfiguration,
  DebugSession,
  ExtensionContext,
  window,
  workspace,
} from "vscode";
import { PeripheralTreeView } from "../svd/peripheralTreeView";
import { HexViewProvider } from "../hexViewProvider";
import { CDTDebugAdapterDescriptorFactory } from "../server";
import { ESP } from "../../config";
import { readParameter } from "../../idfConfiguration";
import { OpenOCDManager } from "../../espIdf/openOcd/openOcdManager";

export type DebugSessionOpenOcdFlags = {
  isOpenOCDLaunchedByDebug: { value: boolean };
  isDebugRestarted: { value: boolean };
};

export function registerPeripheralTreeView(
  context: ExtensionContext,
  peripheralTreeProvider: PeripheralTreeView
) {
  const peripheralTreeView = window.createTreeView("espIdf.peripheralView", {
    treeDataProvider: peripheralTreeProvider,
  });
  context.subscriptions.push(
    peripheralTreeView,
    peripheralTreeView.onDidExpandElement((e) => {
      e.element.expanded = true;
      e.element.getPeripheral().updateData();
      peripheralTreeProvider.refresh();
    }),
    peripheralTreeView.onDidCollapseElement((e) => {
      e.element.expanded = false;
    })
  );
}

export function registerLaunchJsonPortWatcher(
  context: ExtensionContext,
  cdtDebugAdapterFactory: CDTDebugAdapterDescriptorFactory
) {
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration("launch.configurations")) {
        return;
      }
      const workspaceFolder =
        ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      const config = workspace.getConfiguration("launch", workspaceFolder);
      const configurations =
        config.get<DebugConfiguration[]>("configurations") || [];
      for (const conf of configurations) {
        if (
          conf.type === "gdbtarget" &&
          conf.debugPort &&
          !cdtDebugAdapterFactory.checkCurrentPort(conf.debugPort)
        ) {
          cdtDebugAdapterFactory.dispose();
        }
      }
    })
  );
}

export function registerDebugSessionLifecycle(
  context: ExtensionContext,
  peripheralTreeProvider: PeripheralTreeView,
  flags: DebugSessionOpenOcdFlags
) {
  context.subscriptions.push(
    debug.onDidStartDebugSession(async (session) => {
      const svdFile = readParameter(
        "idf.svdFilePath",
        session.workspaceFolder
      ) as string;
      peripheralTreeProvider.debugSessionStarted(session, svdFile, 16);
      if (
        OpenOCDManager.init().isRunning() &&
        session.type === "gdbtarget" &&
        session.configuration.sessionID !== "core-dump.debug.session.ws" &&
        session.configuration.sessionID !== "gdbstub.debug.session.ws"
      ) {
        flags.isOpenOCDLaunchedByDebug.value = true;
      }
      flags.isDebugRestarted.value = false;
    }),
    debug.onDidTerminateDebugSession((session) => {
      peripheralTreeProvider.debugSessionTerminated(session);
      if (flags.isOpenOCDLaunchedByDebug.value && !flags.isDebugRestarted.value) {
        flags.isOpenOCDLaunchedByDebug.value = false;
        OpenOCDManager.init().stop();
      }
    })
  );
}

async function refreshPeripheralsOnStopped(
  peripheralTreeProvider: PeripheralTreeView
) {
  const peripherals = await peripheralTreeProvider.getChildren();
  if (peripherals) {
    for (const p of peripherals) {
      p.getPeripheral().updateData();
    }
  }
  peripheralTreeProvider.refresh();
}

function applyVariablesResponseToHexView(
  hexViewProvider: HexViewProvider,
  variables: { name?: string; value?: string }[]
) {
  for (const variable of variables) {
    if (!variable.name || !variable.value) {
      continue;
    }
    const existingItem = hexViewProvider.findElement(variable.name);
    if (!existingItem) {
      continue;
    }
    const numericValue = parseInt(variable.value, 10);
    if (!isNaN(numericValue)) {
      hexViewProvider.updateElement(variable.name, numericValue);
    }
  }
}

export function registerGdbTargetDebugAdapterTracker(
  context: ExtensionContext,
  peripheralTreeProvider: PeripheralTreeView,
  hexViewProvider: HexViewProvider,
  isDebugRestarted: { value: boolean }
) {
  context.subscriptions.push(
    debug.registerDebugAdapterTrackerFactory("gdbtarget", {
      createDebugAdapterTracker(_session: DebugSession) {
        return {
          onDidSendMessage: async (m) => {
            if (m && m.type === "event" && m.event === "stopped") {
              await refreshPeripheralsOnStopped(peripheralTreeProvider);
            }
            if (
              m.type === "response" &&
              m.command === "variables" &&
              m.body &&
              Array.isArray(m.body.variables)
            ) {
              applyVariablesResponseToHexView(hexViewProvider, m.body.variables);
            }
          },
          onWillReceiveMessage(message) {
            if (message?.command === "disconnect" && message.arguments?.restart) {
              isDebugRestarted.value = true;
            }
          },
        };
      },
    })
  );
}
