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
import {
  getProjectDescriptionJson,
  getProjectElfFilePath,
} from "../workspaceConfig";
import { dirname, join } from "path";
import { pathExists, readFile } from "fs-extra";
import { verifyAppBinary } from "../espIdf/debugAdapter/verifyApp";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { Logger } from "../logger/logger";
import {
  execChildProcess,
  getConfigValueFromSDKConfig,
  getToolchainPath,
} from "../utils";
import { createNewIdfMonitor } from "../espIdf/monitor/command";
import { ESP } from "../config";
import { buildFlashAndMonitor } from "../buildFlashMonitor";

/** ESP-IDF generated gdbinit files, in `idf.py gdb` order. */
const GDBINIT_FILE_NAMES = [
  "symbols",
  "prefix_map",
  "py_extensions",
  "connect",
] as const;

/** Expanded by {@link getConnectCommands} rather than sourced like the other files. */
const GDBINIT_CONNECT_FILE_NAME = "connect";

/** Some GDB builds stall when their Python runtime is unusable, so the probe is bounded. */
async function isGdbWithPython(gdbPath: string) {
  try {
    await execChildProcess(
      gdbPath,
      ["--batch-silent", "--ex", "python import os"],
      dirname(gdbPath),
      undefined,
      { cwd: dirname(gdbPath), timeout: 5000 }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Locates the ESP-IDF generated gdbinit files, preserving the `idf.py gdb` order.
 * Keys of `gdbinit_files` carry a sort index (`01_symbols`, `02_prefix_map`, ...).
 */
async function resolveGdbinitFilePaths(
  gdbinitFiles: { [key: string]: string } | undefined,
  buildDirPath: string
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (!gdbinitFiles && !buildDirPath) {
    return resolved;
  }

  const candidates = gdbinitFiles
    ? Object.keys(gdbinitFiles)
        .sort()
        .map<[string, string]>((key) => [
          key.replace(/^\d+_/, ""),
          gdbinitFiles[key],
        ])
    : GDBINIT_FILE_NAMES.map<[string, string]>((name) => [
        name,
        join(buildDirPath, "gdbinit", name),
      ]);

  for (const [name, filePath] of candidates) {
    if (await pathExists(filePath)) {
      resolved.set(name, filePath);
    }
  }
  return resolved;
}

async function getGdbinitSourceCommands(
  gdbinitPaths: Map<string, string>,
  buildDirPath: string,
  gdbPath: string
): Promise<{ commands: string[]; prefixMapFound: boolean }> {
  const commands: string[] = [];
  let prefixMapFound = false;

  for (const [name, filePath] of gdbinitPaths) {
    if (name === GDBINIT_CONNECT_FILE_NAME) {
      continue;
    }
    if (name === "py_extensions" && !(await isGdbWithPython(gdbPath))) {
      continue;
    }
    commands.push(`source ${filePath}`);
    if (name === "prefix_map") {
      prefixMapFound = true;
    }
  }

  if (!prefixMapFound && buildDirPath) {
    const legacyPrefixMap = join(buildDirPath, "prefix_map_gdbinit");
    if (await pathExists(legacyPrefixMap)) {
      commands.push(`source ${legacyPrefixMap}`);
      prefixMapFound = true;
    }
  }

  return { commands, prefixMapFound };
}

function getRemoteTargetAddress(target: { host?: string; port?: string }) {
  const port = target?.port ?? "3333";
  return target?.host ? `${target.host}:${port}` : `:${port}`;
}

/** GDB constructs spanning multiple lines, which this flat-list parser cannot handle. */
const GDB_SCRIPTING_KEYWORDS = /^(define|document|python|if|while|end|source|shell)\b/;
const GDB_RESUME_COMMAND = /^(c|continue|r|run|start)$/;
const GDB_APP_MAIN_BREAKPOINT = /^(thb|thbreak|b|br|break)\s+app_main$/;
const GDB_TARGET_REMOTE_COMMAND = /^target\s+remote\s+\S+$/;

function getDefaultConnectCommands(config: DebugConfiguration) {
  const commands = [
    "set remotetimeout 10",
    `target remote ${getRemoteTargetAddress(config.target)}`,
    "monitor reset halt",
    "maintenance flush register-cache",
  ];
  if (typeof config.initialBreakpoint === "undefined") {
    commands.push("thbreak app_main");
  }
  return commands;
}

/**
 * Expands ESP-IDF's generated `connect` gdbinit file into individual GDB commands.
 *
 * The file is replayed instead of sourced so its trailing `continue` can be dropped: the
 * adapter runs connect commands before sending `InitializedEvent`, so resuming here would
 * run past breakpoints the client has not inserted yet and hide the resulting stop.
 *
 * Returns `undefined` when the file is missing or has a shape this parser does not
 * understand, so the caller can fall back to {@link getDefaultConnectCommands}.
 */
async function getConnectCommands(
  connectFilePath: string | undefined,
  config: DebugConfiguration
): Promise<string[] | undefined> {
  if (!connectFilePath) {
    return undefined;
  }
  let fileContent: string;
  try {
    fileContent = (await readFile(connectFilePath)).toString();
  } catch (error) {
    Logger.error(
      `Failed to read gdbinit connect file ${connectFilePath}`,
      error as Error,
      "CDTDebugConfigurationProvider getConnectCommands"
    );
    return undefined;
  }

  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.some((line) => GDB_SCRIPTING_KEYWORDS.test(line))) {
    return undefined;
  }

  const usesInitialBreakpointFromConfig =
    typeof config.initialBreakpoint !== "undefined";
  const overridesRemoteAddress = !!(config.target?.host || config.target?.port);

  const commands: string[] = [];
  for (const line of lines) {
    if (GDB_RESUME_COMMAND.test(line)) {
      continue;
    }
    if (usesInitialBreakpointFromConfig && GDB_APP_MAIN_BREAKPOINT.test(line)) {
      continue;
    }
    if (overridesRemoteAddress && GDB_TARGET_REMOTE_COMMAND.test(line)) {
      commands.push(`target remote ${getRemoteTargetAddress(config.target)}`);
      continue;
    }
    commands.push(line);
  }

  // The `CONFIG_IDF_TARGET_LINUX` variant of this file has no remote to attach to.
  const connectsToTarget = commands.some((cmd) => /^target\s/.test(cmd));
  return connectsToTarget ? commands : undefined;
}

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
      // config.gdb may still hold an unresolved ${command:...} variable at this point.
      const gdbPath = config.gdb.includes("${")
        ? await getToolchainPath(folder.uri, "gdb")
        : config.gdb;

      const buildDirPath = readParameter("idf.buildPath", folder) as string;
      const isPostMortemSession =
        config.sessionID === "core-dump.debug.session.ws" ||
        config.sessionID === "gdbstub.debug.session.ws";
      const projectDescription = await getProjectDescriptionJson(folder.uri);
      const gdbinitPaths = await resolveGdbinitFilePaths(
        projectDescription?.gdbinitFiles,
        buildDirPath
      );
      const {
        commands: preConnectCommands,
        prefixMapFound,
      } = await getGdbinitSourceCommands(gdbinitPaths, buildDirPath, gdbPath);

      if (!isPostMortemSession) {
        const connectCommands =
          (await getConnectCommands(
            gdbinitPaths.get(GDBINIT_CONNECT_FILE_NAME),
            config
          )) ?? getDefaultConnectCommands(config);
        preConnectCommands.push(...connectCommands);
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
