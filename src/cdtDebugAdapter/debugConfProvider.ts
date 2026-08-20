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
  Uri,
  WorkspaceFolder,
  window,
  workspace,
} from "vscode";
import { readParameter } from "../idfConfiguration";
import { getProjectElfFilePath } from "../workspaceConfig";
import { join } from "path";
import { pathExists } from "fs-extra";
import { verifyAppBinary } from "../espIdf/debugAdapter/verifyApp";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { Logger } from "../logger/logger";
import { getConfigValueFromSDKConfig, getToolchainPath } from "../utils";
import { createNewIdfMonitor } from "../espIdf/monitor/command";
import { ESP } from "../config";
import { buildFlashAndMonitor } from "../buildFlashMonitor";

export class CDTDebugConfigurationProvider
  implements DebugConfigurationProvider {
  public async resolveDebugConfigurationWithSubstitutedVariables(
    folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration,
    token?: CancellationToken
  ) {
    if (!folder) {
      const workspaceFolderUri = ESP.GlobalConfiguration.store.get<Uri>(
        ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
      );
      folder = workspace.getWorkspaceFolder(workspaceFolderUri);
      if (!folder) {
        folder = await window.showWorkspaceFolderPick({
          placeHolder: "Pick a workspace folder to start a debug session.",
        });
        if (!folder) {
          throw new Error("No folder was selected to start debug session");
        }
      }
    }
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
      await createNewIdfMonitor(folder.uri, true);
    }
    const openOCDManager = OpenOCDManager.init();
    if (
      !openOCDManager.isRunning() &&
      debugConfiguration.sessionID !== "core-dump.debug.session.ws" &&
      debugConfiguration.sessionID !== "gdbstub.debug.session.ws" &&
      debugConfiguration.sessionID !== "qemu.debug.session" &&
      debugConfiguration.runOpenOCD !== false
    ) {
      await openOCDManager.start({ launchedByDebug: true });
    }
    return debugConfiguration;
  }
  public async resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    config: DebugConfiguration,
    token?: CancellationToken
  ): Promise<DebugConfiguration> {
    try {
      if (!folder) {
        const workspaceFolderUri = ESP.GlobalConfiguration.store.get<Uri>(
          ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
        );
        folder = workspace.getWorkspaceFolder(workspaceFolderUri);
        if (!folder) {
          folder = await window.showWorkspaceFolderPick({
            placeHolder: "Pick a workspace folder to start a debug session.",
          });
          if (!folder) {
            throw new Error("No folder was selected to start debug session");
          }
        }
      }
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

      const buildDirPath = readParameter("idf.buildPath", folder) as string;
      const preConnectCommands: string[] = [];
      let prefixMapFound = false;
      const isPostMortemSession =
        config.sessionID === "core-dump.debug.session.ws" ||
        config.sessionID === "gdbstub.debug.session.ws";
      if (buildDirPath) {
        const gdbinitFromBuild = join(buildDirPath, "gdbinit", "gdbinit");
        if (await pathExists(gdbinitFromBuild)) {
          preConnectCommands.push(`source ${gdbinitFromBuild}`);
        } else if (!isPostMortemSession) {
          preConnectCommands.push(
            "set remotetimeout 10",
            "target remote :3333",
            "monitor reset halt",
            "maintenance flush register-cache",
            "thbreak app_main"
          );
        }

        const gdbinitPrefixMap = join(buildDirPath, "gdbinit", "prefix_map");
        if (await pathExists(gdbinitPrefixMap)) {
          preConnectCommands.push(`source ${gdbinitPrefixMap}`);
          prefixMapFound = true;
        } else {
          const prefixMapGdbinit = join(buildDirPath, "prefix_map_gdbinit");
          if (await pathExists(prefixMapGdbinit)) {
            preConnectCommands.push(`source ${prefixMapGdbinit}`);
            prefixMapFound = true;
          }
        }
      }

      if (!isPostMortemSession && !prefixMapFound) {
        try {
          const isAppReproducibleBuildEnabled = await getConfigValueFromSDKConfig(
            "CONFIG_APP_REPRODUCIBLE_BUILD",
            folder.uri
          );
          if (isAppReproducibleBuildEnabled === "y") {
            window.showInformationMessage(
              `CONFIG_APP_REPRODUCIBLE_BUILD is enabled but no gdbinit prefix map was found.`
            );
          }
        } catch (error) {
          Logger.error(
            "Failed to read CONFIG_APP_REPRODUCIBLE_BUILD from sdkconfig",
            error as Error,
            "CDTDebugConfigurationProvider resolveDebugConfiguration"
          );
        }
      }

      if (!isPostMortemSession && config.initialBreakpoint) {
        if (!Array.isArray(config.initCommands)) {
          config.initCommands = [];
        }
        config.initCommands.push(`thb ${config.initialBreakpoint.trim()}`);
      }

      if (preConnectCommands.length > 0) {
        if (!config.target) {
          config.target = { connectCommands: [] };
        }
        if (!Array.isArray(config.target.connectCommands)) {
          config.target.connectCommands = [];
        }
        const connectCommands = config.target.connectCommands as string[];
        for (let i = preConnectCommands.length - 1; i >= 0; i--) {
          const cmd = preConnectCommands[i];
          if (!connectCommands.includes(cmd)) {
            connectCommands.unshift(cmd);
          }
        }
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
      const msg = error.message
        ? error.message
        : "Some build files doesn't exist. Build this project first.";
      Logger.error(msg, error, "CDTDebugConfigurationProvider");
      return;
    }
    return config;
  }
}
