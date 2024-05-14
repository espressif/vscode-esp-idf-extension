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
} from "vscode";
import { readParameter } from "../idfConfiguration";
import { getProjectName } from "../workspaceConfig";
import { join } from "path";
import { pathExists } from "fs-extra";
import { verifyAppBinary } from "../espIdf/debugAdapter/verifyApp";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { Logger } from "../logger/logger";
import { getToolchainPath } from "../utils";

export class CDTDebugConfigurationProvider
  implements DebugConfigurationProvider {
  public async resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    config: DebugConfiguration,
    token?: CancellationToken
  ): Promise<DebugConfiguration> {
    try {
      if (!config.program) {
        const buildDirPath = readParameter("idf.buildPath", folder) as string;
        const projectName = await getProjectName(buildDirPath);
        const elfFilePath = join(buildDirPath, `${projectName}.elf`);
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
          "set remotetimeout 20",
          "set remote hardware-watchpoint-limit {IDF_TARGET_CPU_WATCHPOINT_NUM}",
          "mon reset halt",
          "maintenance flush register-cache",
          "thb app_main",
        ];
      }

      if (config.initCommands && Array.isArray(config.initCommands)) {
        let idfTarget = readParameter("idf.adapterTargetName", folder);
        if (idfTarget === "custom") {
          idfTarget = readParameter("idf.customAdapterTargetName", folder);
        }
        type IdfTarget =
          | "esp32"
          | "esp32s2"
          | "esp32s3"
          | "esp32c2"
          | "esp32c3"
          | "esp32c6"
          | "esp32h2";
        // Mapping of idfTarget to corresponding CPU watchpoint numbers
        const idfTargetWatchpointMap: Record<IdfTarget, number> = {
          esp32: 2,
          esp32s2: 2,
          esp32s3: 2,
          esp32c2: 2,
          esp32c3: 8,
          esp32c6: 4,
          esp32h2: 4,
        };
        config.initCommands = config.initCommands.map((cmd: string) =>
          cmd.replace(
            "{IDF_TARGET_CPU_WATCHPOINT_NUM}",
            idfTargetWatchpointMap[idfTarget]
          )
        );
      }

      if (
        config.sessionID !== "core-dump.debug.session.ws" &&
        config.sessionID !== "gdbstub.debug.session.ws" &&
        !config.target
      ) {
        config.target = {
          type: "extended-remote",
          port: "3333",
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
      const openOCDManager = OpenOCDManager.init();
      if (
        !openOCDManager.isRunning() &&
        config.sessionID !== "core-dump.debug.session.ws" &&
        config.sessionID !== "gdbstub.debug.session.ws" &&
        config.sessionID !== "qemu.debug.session" &&
        !config.runOpenOCD
      ) {
        await openOCDManager.start();
      }
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Some build files doesn't exist. Build this project first.";
      Logger.error(msg, error);
      return;
    }
    return config;
  }
}
