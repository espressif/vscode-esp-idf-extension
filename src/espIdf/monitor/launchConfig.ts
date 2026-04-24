/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { join } from "path";
import { R_OK } from "constants";
import { WorkspaceFolder } from "vscode";
import { readParameter, readSerialPort } from "../../idfConfiguration";
import { ESP } from "../../config";
import {
  getIdfTargetFromSdkconfig,
  getProjectElfFilePath,
} from "../../workspaceConfig";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { FlashSession } from "../../flash/shared/flashSession";
import { BuildTask } from "../../build/buildTask";
import { getMonitorBaudRate } from "./getMonitorBaudRate";
import { MonitorConfig } from "./types";
import { canAccessFile, getEspIdfFromCMake, getToolchainToolName } from "../../utils";

export type MonitorLaunchFailureReason =
  | "one_task_at_time"
  | "no_port"
  | "no_python"
  | "no_idf_path"
  | "no_idf_monitor"
  | "no_idf_target"
  | "elf_path_error";

export type LoadMonitorLaunchConfigResult =
  | { ok: true; config: MonitorConfig; idfPath: string }
  | {
      ok: false;
      reason: MonitorLaunchFailureReason;
      /** e.g. idf_monitor.py path when reason is no_idf_monitor */
      detail?: string;
    };

export async function loadMonitorLaunchConfig(
  workspaceFolder: WorkspaceFolder,
  noReset: boolean,
  wsPort?: number
): Promise<LoadMonitorLaunchConfigResult> {
  if (BuildTask.isBuilding || FlashSession.isFlashing) {
    return { ok: false, reason: "one_task_at_time" };
  }

  const serialPort = await readSerialPort(workspaceFolder.uri, false);
  const monitorPort = readParameter(
    "idf.monitorPort",
    workspaceFolder
  ) as string;
  const port = monitorPort ? monitorPort : serialPort;
  if (!port) {
    return { ok: false, reason: "no_port" };
  }

  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath || !canAccessFile(pythonBinPath, R_OK)) {
    return { ok: false, reason: "no_python" };
  }

  const currentEnvVars = ESP.ProjectConfiguration.store.get<{
    [key: string]: string;
  }>(ESP.ProjectConfiguration.CURRENT_IDF_CONFIGURATION, {});
  const idfPath = currentEnvVars["IDF_PATH"];
  if (!idfPath) {
    return { ok: false, reason: "no_idf_path" };
  }
  const idfVersion = await getEspIdfFromCMake(idfPath);
  const sdkMonitorBaudRate = await getMonitorBaudRate(workspaceFolder.uri);
  const idfMonitorToolPath = join(idfPath, "tools", "idf_monitor.py");
  if (!canAccessFile(idfMonitorToolPath, R_OK)) {
    return {
      ok: false,
      reason: "no_idf_monitor",
      detail: idfMonitorToolPath,
    };
  }

  const idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder.uri);
  if (!idfTarget) {
    return { ok: false, reason: "no_idf_target" };
  }

  let elfFilePath: string;
  try {
    elfFilePath = await getProjectElfFilePath(workspaceFolder.uri);
  } catch (error) {
    return {
      ok: false,
      reason: "elf_path_error",
      detail:
        error instanceof Error ? error.message : "getProjectElfFilePath failed",
    };
  }
  const toolchainPrefix = getToolchainToolName(idfTarget, "");
  const shellPath = readParameter(
    "idf.customTerminalExecutable",
    workspaceFolder
  ) as string;
  const shellExecutableArgs = readParameter(
    "idf.customTerminalExecutableArgs",
    workspaceFolder
  ) as string[];
  const enableTimestamps = readParameter(
    "idf.monitorEnableTimestamps",
    workspaceFolder
  ) as boolean;
  const customTimestampFormat = readParameter(
    "idf.monitorCustomTimestampFormat",
    workspaceFolder
  ) as string;

  const config: MonitorConfig = {
    port,
    baudRate: sdkMonitorBaudRate,
    pythonBinPath,
    idfTarget,
    idfMonitorToolPath,
    idfVersion,
    noReset,
    enableTimestamps,
    customTimestampFormat,
    elfFilePath,
    workspaceFolder,
    toolchainPrefix,
    shellPath,
    shellExecutableArgs,
    wsPort,
  };

  return { ok: true, config, idfPath };
}
