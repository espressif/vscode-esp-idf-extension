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
import { pathExists } from "fs-extra";
import { readParameter, readSerialPort } from "../../configuration/idf";
import { getCurrentIdfConfiguration, getVirtualEnvPythonPath } from "../../configuration/env";
import {
  getIdfTargetFromSdkconfig,
  getProjectElfFilePath,
} from "../../configuration/workspace";
import { FlashSession } from "../../flash/shared/flashSession";
import { BuildSession } from "../../build/buildSession";
import { EraseFlashSession } from "../../eraseFlash/eraseFlashSession";
import { getMonitorBaudRate } from "./getMonitorBaudRate";
import { MonitorConfig } from "./types";
import { canAccessFile, getEspIdfFromCMake, getToolchainToolName } from "../../utils";
import { Logger } from "../../common/logger";
import {
  fileNotFound,
  idfTargetNotSet,
  idfTaskInProgress,
  idfToolNotFound,
  invalidConfiguration,
  invalidIdfVersion,
  IdfTaskName,
  isKnownError,
  missingDependency,
  noPortSelected,
} from "../../common/error/knownError";

const UNRESOLVED_IDF_VERSION = "x.x";

export async function loadMonitorLaunchConfig(
  workspaceFolder: WorkspaceFolder,
  noReset: boolean,
  wsPort?: number
): Promise<{ config: MonitorConfig; idfPath: string }> {
  if (BuildSession.isActive) {
    throw idfTaskInProgress(IdfTaskName.Build);
  }
  if (FlashSession.isActive) {
    throw idfTaskInProgress(IdfTaskName.Flash);
  }
  if (EraseFlashSession.isActive) {
    throw idfTaskInProgress(IdfTaskName.EraseFlash);
  }

  const serialPort = await readSerialPort(workspaceFolder.uri, false);
  const monitorPort = readParameter(
    "idf.monitorPort",
    workspaceFolder
  ) as string;
  const port = monitorPort ? monitorPort : serialPort;
  if (!port) {
    throw noPortSelected();
  }

  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath || !canAccessFile(pythonBinPath, R_OK)) {
    throw missingDependency("Python");
  }

  const currentEnvVars = getCurrentIdfConfiguration();
  const idfPath = currentEnvVars["IDF_PATH"];
  if (!idfPath) {
    throw invalidConfiguration("IDF_PATH");
  }
  let idfVersion: string;
  try {
    idfVersion = await getEspIdfFromCMake(idfPath);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "getEspIdfFromCMake failed";
    throw invalidIdfVersion(idfPath, detail);
  }
  if (idfVersion === UNRESOLVED_IDF_VERSION) {
    throw invalidIdfVersion(idfPath);
  }
  const sdkMonitorBaudRate = await getMonitorBaudRate(workspaceFolder.uri);
  const idfMonitorToolPath = join(idfPath, "tools", "idf_monitor.py");
  if (!canAccessFile(idfMonitorToolPath, R_OK)) {
    throw idfToolNotFound("idf_monitor.py");
  }

  const idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder.uri);
  if (!idfTarget) {
    throw idfTargetNotSet();
  }

  let elfFilePath: string;
  try {
    elfFilePath = await getProjectElfFilePath(workspaceFolder.uri);
    if (!(await pathExists(elfFilePath))) {
      throw fileNotFound(elfFilePath);
    }
  } catch (error) {
    if (isKnownError(error)) {
      throw error;
    }
    const errStr =
      error instanceof Error
        ? error.message
        : "Failed to get project ELF file path";
    Logger.error(
      errStr,
      error as Error,
      "monitor launchConfig getProjectElfFilePath"
    );
    throw fileNotFound(errStr);
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

  return { config, idfPath };
}
