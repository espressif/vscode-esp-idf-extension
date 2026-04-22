/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 26th February 2024 2:54:26 pm
 * Copyright 2024 Espressif Systems (Shanghai) CO LTD
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
  CancellationToken,
  DebugConfiguration,
  DebugConfigurationProvider,
  WorkspaceFolder,
  window,
} from "vscode";
import { readParameter } from "../idfConfiguration";
import {
  getIdfTargetFromSdkconfig,
  getProjectElfFilePath,
} from "../workspaceConfig";
import { join } from "path";
import { pathExists } from "fs-extra";
import { verifyAppBinary } from "../espIdf/debugAdapter/verifyApp";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { Logger } from "../logger/logger";
import { getConfigValueFromSDKConfig, getToolchainPath } from "../utils";
import { ESP } from "../config";
import { buildFlashAndMonitor } from "../buildFlashMonitor";
import { monitorMain } from "../espIdf/monitor/main";

async function getOrPickWorkspaceFolder(
  folder: WorkspaceFolder | undefined
): Promise<WorkspaceFolder> {
  if (!folder) {
    folder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (!folder) {
      folder = await window.showWorkspaceFolderPick({
        placeHolder: "Pick a workspace folder to start a debug session.",
      });
      if (!folder) {
        throw new Error("No folder was selected to start debug session");
      }
    }
  }
  return folder;
}

export class CDTDebugConfigurationProvider
  implements DebugConfigurationProvider {
  public async resolveDebugConfigurationWithSubstitutedVariables(
    folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration,
    token?: CancellationToken
  ) {
    folder = await getOrPickWorkspaceFolder(folder);
    const useMonitorWithDebug = readParameter(
      "idf.launchMonitorOnDebugSession",
      folder
    );
    if (debugConfiguration.buildFlashMonitor) {
      await buildFlashAndMonitor(folder.uri, true);
    } else if (
      debugConfiguration.sessionID !== "core-dump.debug.session.ws" &&
      debugConfiguration.sessionID !== "gdbstub.debug.session.ws" &&
      useMonitorWithDebug
    ) {
      await monitorMain(folder, true);
    }
    const openOCDManager = OpenOCDManager.init();
    if (
      !openOCDManager.isRunning() &&
      debugConfiguration.sessionID !== "core-dump.debug.session.ws" &&
      debugConfiguration.sessionID !== "gdbstub.debug.session.ws" &&
      debugConfiguration.sessionID !== "qemu.debug.session" &&
      debugConfiguration.runOpenOCD !== false
    ) {
      await openOCDManager.start();
    }
    return debugConfiguration;
  }
  public async resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    config: DebugConfiguration,
    token?: CancellationToken
  ): Promise<DebugConfiguration | undefined> {
    try {
      folder = await getOrPickWorkspaceFolder(folder);
      if (!config.program) {
        const elfFilePath = await getProjectElfFilePath(folder.uri);
        const elfFileExists = await pathExists(elfFilePath);
        if (!elfFileExists) {
          throw new Error(
            `${elfFilePath} doesn't exist. Build this project first.`
          );
        }
        config.program = elfFilePath;
      }
      if (!config.gdb) {
        config.gdb = await getToolchainPath(folder.uri, "gdb");
      }
      if (
        config.sessionID !== "core-dump.debug.session.ws" &&
        config.sessionID !== "gdbstub.debug.session.ws" &&
        (!config.initCommands || config.initCommands.length === 0)
      ) {
        config.initCommands = [
          "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
          "mon reset halt",
          "maintenance flush register-cache",
        ];
        const isAppReproducibleBuildEnabled = await getConfigValueFromSDKConfig(
          "CONFIG_APP_REPRODUCIBLE_BUILD",
          folder.uri
        );
        if (isAppReproducibleBuildEnabled === "y") {
          const buildDirPath = readParameter("idf.buildPath", folder) as string;
          if (!buildDirPath) {
            throw new Error("Failed to get build directory path.");
          }
          const gdbinitPrefixMap = join(buildDirPath, "gdbinit", "prefix_map");
          const gdbinitPrefixMapExists = await pathExists(gdbinitPrefixMap);
          if (gdbinitPrefixMapExists) {
            config.initCommands.push(`source ${gdbinitPrefixMap}`);
          } else {
            const prefix_map_gdbinit = join(buildDirPath, "prefix_map_gdbinit");
            const prefix_map_gdbinitExists = await pathExists(
              prefix_map_gdbinit
            );
            if (prefix_map_gdbinitExists) {
              config.initCommands.push(`source ${prefix_map_gdbinit}`);
            } else {
              window.showInformationMessage(
                `CONFIG_APP_REPRODUCIBLE_BUILD is enabled but no gdbinit prefix map was found.`
              );
            }
          }
        }
        if (typeof config.initialBreakpoint === "undefined") {
          config.initCommands.push(`thb app_main`);
        } else if (config.initialBreakpoint) {
          config.initCommands.push(`thb ${config.initialBreakpoint.trim()}`);
        }
      }

      if (config.initCommands && Array.isArray(config.initCommands)) {
        let idfTarget = await getIdfTargetFromSdkconfig(folder.uri);
        type IdfTarget =
          | "esp32"
          | "esp32s2"
          | "esp32s3"
          | "esp32c2"
          | "esp32c3"
          | "esp32c6"
          | "esp32h2"
          | "esp32p4"
          | "esp32c4"
          | "esp32c5"
          | "esp32c61";
        // Mapping of idfTarget to corresponding CPU watchpoint numbers
        const idfTargetWatchpointMap: Record<IdfTarget, number> = {
          esp32: 2,
          esp32s2: 2,
          esp32s3: 2,
          esp32c2: 2,
          esp32c3: 8,
          esp32c6: 4,
          esp32h2: 4,
          esp32p4: 3,
          esp32c4: 2,
          esp32c5: 4,
          esp32c61: 4,
        };
        const rawIdfTarget = idfTarget ?? "";
        const watchpointNum =
          rawIdfTarget !== "" &&
          Object.prototype.hasOwnProperty.call(
            idfTargetWatchpointMap,
            rawIdfTarget
          )
            ? idfTargetWatchpointMap[rawIdfTarget as IdfTarget]
            : undefined;
        if (watchpointNum === undefined && rawIdfTarget !== "") {
          Logger.info(
            `Unknown IDF target "${rawIdfTarget}" for CPU hardware watchpoint mapping; using default 2.`,
            { context: "CDTDebugConfigurationProvider" }
          );
        }
        config.initCommands = config.initCommands.map((cmd: string) =>
          cmd.replace(
            "{IDF_TARGET_CPU_WATCHPOINT_NUM}",
            String(watchpointNum ?? 2)
          )
        );
      }

      if (
        config.sessionID !== "core-dump.debug.session.ws" &&
        config.sessionID !== "gdbstub.debug.session.ws" &&
        !config.target
      ) {
        config.target = {
          connectCommands: [
            "set remotetimeout 20",
            "-target-select extended-remote localhost:3333",
          ],
        };
      }
      if (folder && folder.uri && config.verifyAppBinBeforeDebug) {
        const isSameAppBinary = await verifyAppBinary(folder.uri);
        if (!isSameAppBinary) {
          throw new Error(
            `Current app binary is different from your project. Flash first.`
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Logger.error(msg, error as Error, "CDTDebugConfigurationProvider resolveDebugConfiguration");
      return undefined;
    }
    return config;
  }
}
