/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 11:05:33 am
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

import { ExtensionContext, l10n, ViewColumn, window, workspace } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import {
  minIdfVersionCheck,
  openFolderCheck,
  PreCheck,
  webIdeCheck,
} from "../../common/PreCheck";
import { traceInvalidCommand } from "../../common/error/knownError";
import { HandleErrorOptions } from "../../common/error/types";
import { AppTraceManager } from "./appTraceManager";
import { GdbHeapTraceManager } from "./gdbHeapTraceManager";
import {
  AppTraceArchiveItems,
  AppTraceArchiveTreeDataProvider,
  TraceType,
} from "./tree/appTraceArchiveTreeDataProvider";
import { AppTraceTreeDataProvider } from "./tree/appTraceTreeDataProvider";
import { ESP } from "../../config";
import { SystemViewResultParser } from "./system-view";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { AppTracePanel } from "./appTracePanel";

function registerTracingCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any,
  options: HandleErrorOptions = { outputChannel: "Tracing" }
) {
  registerIDFCommand(context, name, callback, options);
}

export function registerAppTraceCommands(context: ExtensionContext) {
  let appTraceTreeDataProvider = new AppTraceTreeDataProvider();
  let appTraceArchiveTreeDataProvider = new AppTraceArchiveTreeDataProvider();
  const appTraceManager = new AppTraceManager(
    appTraceTreeDataProvider,
    appTraceArchiveTreeDataProvider
  );
  const gdbHeapTraceManager = new GdbHeapTraceManager(
    appTraceTreeDataProvider,
    appTraceArchiveTreeDataProvider
  );

  context.subscriptions.push(
    appTraceTreeDataProvider.registerDataProviderForTree("idfAppTracer"),
    appTraceArchiveTreeDataProvider.registerDataProviderForTree(
      "idfAppTraceArchive"
    )
  );
  registerTracingCommand(
    context,
    "espIdf.apptrace",
    () => {
      PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        const appTraceLabel =
          typeof appTraceTreeDataProvider.appTraceButton.label === "string"
            ? appTraceTreeDataProvider.appTraceButton.label.match(/start/gi)
            : appTraceTreeDataProvider.appTraceButton.label?.label.match(
                /start/gi
              );
        if (appTraceLabel) {
          await appTraceManager.start(wsFolder);
        } else {
          await appTraceManager.stop(wsFolder);
        }
      });
    },
  );

  registerTracingCommand(
    context,
    "espIdf.heaptrace",
    async () => {
      const idfVersionCheck = await minIdfVersionCheck("4.2");
      PreCheck.perform(
        [idfVersionCheck, webIdeCheck, openFolderCheck],
        async () => {
          const heapTraceLabel =
            typeof appTraceTreeDataProvider.heapTraceButton.label === "string"
              ? appTraceTreeDataProvider.heapTraceButton.label.match(/start/gi)
              : appTraceTreeDataProvider.heapTraceButton.label?.label.match(
                  /start/gi
                );
          if (heapTraceLabel) {
            const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
            await gdbHeapTraceManager.start(wsFolder.uri);
          } else {
            await gdbHeapTraceManager.stop();
          }
        }
      );
    },
  );

  registerTracingCommand(
    context,
    "espIdf.apptrace.customize",
    () => {
      return PreCheck.perform([openFolderCheck], async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        await AppTraceManager.saveConfiguration(wsFolder);
      });
    },
  );

  registerTracingCommand(
    context,
    "espIdf.apptrace.archive.refresh",
    () => {
      return PreCheck.perform([openFolderCheck], () => {
        appTraceArchiveTreeDataProvider.populateArchiveTree();
      });
    },
  );

  registerTracingCommand(
    context,
    "espIdf.apptrace.archive.showReport",
    (trace: AppTraceArchiveItems) => {
      if (!trace) {
        throw traceInvalidCommand();
      }
      PreCheck.perform([openFolderCheck], async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (trace.type === TraceType.HeapTrace) {
          enum TracingViewType {
            HeapTracingPlot,
            SystemViewTracing,
          }
          const placeHolder = l10n.t(
            "Do you want to view Heap Trace plot or System View Trace"
          );
          const choice = await window.showQuickPick(
            [
              {
                type: TracingViewType.SystemViewTracing,
                label: "$(symbol-keyword) System View Tracing",
                detail: l10n.t(
                  "Show System View Tracing Plot (will open a webview window)"
                ),
              },
              {
                type: TracingViewType.HeapTracingPlot,
                label: "$(graph) Heap Tracing",
                detail: l10n.t("Open Old Heap/App Trace Panel"),
              },
            ],
            {
              placeHolder,
              ignoreFocusOut: true,
            }
          );
          if (!choice) {
            return;
          }
          if (choice.type === TracingViewType.SystemViewTracing) {
            return SystemViewResultParser.parseWithProgress(
              trace,
              context.extensionPath,
              wsFolder.uri
            );
          }
        }

        if (trace.type === TraceType.AppTrace) {
          const textDocument = await workspace.openTextDocument(trace.filePath);
          const column = window.activeTextEditor
            ? window.activeTextEditor.viewColumn
            : undefined;
          await window.showTextDocument(textDocument, {
            viewColumn: column || ViewColumn.One,
          });
          return;
        }

        const currentEnvVars = getCurrentIdfConfiguration();
        const espIdfPath = currentEnvVars["IDF_PATH"];
        AppTracePanel.createOrShow(context, {
          trace: {
            fileName: trace.fileName,
            filePath: trace.filePath,
            type: trace.type,
            workspacePath: wsFolder.uri.fsPath,
            idfPath: espIdfPath,
          },
        });
      });
    },
  );
}
