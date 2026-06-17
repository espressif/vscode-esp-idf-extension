/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 16th June 2026 4:19:49 pm
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

import { debug, ExtensionContext, l10n, workspace } from "vscode";
import { QemuLaunchMode, QemuManager } from "./qemuManager";
import { registerIDFCommand } from "../common/registerCommand";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { openFolderCheck } from "../common/PreCheck";
import { Logger } from "../common/logger";
import { getToolchainPath, sleep } from "../utils";
import { readParameter } from "../configuration/idf";
import { ESP } from "../config";

export function registerQEMUCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.qemuCommand", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      "ESP-IDF: Starting ESP-IDF QEMU",
      async (_progress, _cancelToken) => {
        try {
          QemuManager.init().commandHandler();
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(msg, error as Error, "qemuCommand");
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.qemuDebug", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Starting ESP-IDF QEMU Debug"),
      async (_progress, _cancelToken) => {
        try {
          if (QemuManager.init().isRunning()) {
            QemuManager.init().stop();
            await sleep(1000);
          }
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          const monitorAfterDebug = readParameter(
            "idf.qemuDebugMonitor",
            wsFolder.uri
          ) as boolean;
          let qemuMode = monitorAfterDebug
            ? QemuLaunchMode.DebugMonitor
            : QemuLaunchMode.Debug;
          await QemuManager.init().start(qemuMode, wsFolder.uri);
          const gdbPath = await getToolchainPath(wsFolder.uri, "gdb");
          const workspaceFolder = workspace.getWorkspaceFolder(wsFolder.uri);
          await debug.startDebugging(workspaceFolder, {
            name: "GDB QEMU",
            type: "gdbtarget",
            request: "attach",
            sessionID: "qemu.debug.session",
            gdb: gdbPath,
            initCommands: [
              "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
              "mon reset halt",
              "maintenance flush register-cache",
              "thb app_main",
            ],
            target: {
              type: "remote",
              host: "localhost",
              port: "3333",
            },
          });
          debug.onDidTerminateDebugSession(async (session) => {
            if (session.configuration.sessionID === "qemu.debug.session") {
              QemuManager.init().stop();
            }
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(msg, error as Error, "qemu debug");
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.monitorQemu", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Starting ESP-IDF QEMU Monitor"),
      async (_progress, _cancelToken) => {
        try {
          const isQemuLaunched = QemuManager.init().isRunning();
          if (isQemuLaunched) {
            QemuManager.init().stop();
          }
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          await QemuManager.init().start(QemuLaunchMode.Monitor, wsFolder.uri);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(msg, error as Error, "qemu monitor");
        }
      }
    );
  });
}
