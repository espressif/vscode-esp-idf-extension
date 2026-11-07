/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { join } from "path";
import { R_OK } from "constants";
import { commands, Uri, WorkspaceFolder } from "vscode";
import { ErrorSeverity } from "../../common/customNotifications";
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
import { SerialPort } from "../serial/serialPort";
import { Logger } from "../../common/logger";
import { canAccessFile, getEspIdfFromCMake, getToolchainToolName } from "../../utils";
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

type ReadSerialPortFn = (
  workspaceFolder: Uri,
  useMonitorPort: boolean
) => Promise<string>;
type PromptForPortFn = (
  workspaceFolder: Uri,
  useMonitorPort: boolean
) => Promise<string | undefined>;

let readSerialPortForTests: ReadSerialPortFn | undefined;
let promptForPortForTests: PromptForPortFn | undefined;

/** @internal Test helper to stub serial port resolution for the monitor. */
export function setMonitorLaunchConfigTestHooks(hooks?: {
  readSerialPort?: ReadSerialPortFn;
  promptForPort?: PromptForPortFn;
}): void {
  readSerialPortForTests = hooks?.readSerialPort;
  promptForPortForTests = hooks?.promptForPort;
}

async function readMonitorSerialPort(
  workspaceFolder: Uri,
  useMonitorPort: boolean
): Promise<string> {
  try {
    return await (readSerialPortForTests ?? readSerialPort)(
      workspaceFolder,
      useMonitorPort
    );
  } catch (error) {
    if (!isKnownError(error)) {
      throw error;
    }
    Logger.warn(
      `Serial port auto-detection failed (${error.code}), asking for a port.`
    );
    return "";
  }
}

export async function resolveMonitorPort(
  workspaceFolder: WorkspaceFolder
): Promise<string> {
  const monitorPort = await readMonitorSerialPort(workspaceFolder.uri, true);
  if (monitorPort) {
    return monitorPort;
  }
  const serialPort = await readMonitorSerialPort(workspaceFolder.uri, false);
  if (serialPort) {
    return serialPort;
  }
  const selectedPort = promptForPortForTests
    ? await promptForPortForTests(workspaceFolder.uri, false)
    : await SerialPort.shared().promptUserToSelect(workspaceFolder.uri, false);
  if (selectedPort) {
    return selectedPort;
  }
  throw noPortSelected({
    userMessage: "Select a serial port before starting the monitor.",
    logMessage: "No serial port selected for monitor.",
    actions: [
      {
        label: "Select Port",
        execute: () => commands.executeCommand("espIdf.selectPort"),
      },
    ],
  });
}

export async function loadMonitorLaunchConfig(
  workspaceFolder: WorkspaceFolder,
  noReset: boolean,
  wsPort?: number
): Promise<{ config: MonitorConfig; idfPath: string }> {
  if (BuildSession.isActive) {
    throw idfTaskInProgress(IdfTaskName.Build, {
      severity: ErrorSeverity.Warning,
      userMessage:
        "Wait for ESP-IDF {taskName} to finish before starting the monitor.",
      logMessage: "Attempted to start monitor while {taskName} is in progress.",
      actions: [],
    });
  }
  if (FlashSession.isActive) {
    throw idfTaskInProgress(IdfTaskName.Flash, {
      severity: ErrorSeverity.Warning,
      userMessage:
        "Wait for ESP-IDF {taskName} to finish before starting the monitor.",
      logMessage: "Attempted to start monitor while {taskName} is in progress.",
      actions: [],
    });
  }
  if (EraseFlashSession.isActive) {
    throw idfTaskInProgress(IdfTaskName.EraseFlash, {
      severity: ErrorSeverity.Warning,
      userMessage:
        "Wait for ESP-IDF {taskName} to finish before starting the monitor.",
      logMessage: "Attempted to start monitor while {taskName} is in progress.",
      actions: [],
    });
  }

  const port = await resolveMonitorPort(workspaceFolder);

  const pythonBinPath = getVirtualEnvPythonPath();
  if (!pythonBinPath || !canAccessFile(pythonBinPath, R_OK)) {
    throw missingDependency("Python");
  }

  const currentEnvVars = getCurrentIdfConfiguration();
  const idfPath = currentEnvVars["IDF_PATH"];
  if (!idfPath) {
    throw invalidConfiguration("IDF_PATH", {
      userMessage:
        "Extension setting {setting} is invalid. Please review your configuration.",
      logMessage: "Invalid extension configuration: {setting}.",
      actions: [
        {
          label: "Open Settings",
          execute: () =>
            commands.executeCommand(
              "workbench.action.openSettings",
              "idf.customExtraVars"
            ),
        },
      ],
    });
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

  const elfFilePath = await getProjectElfFilePath(workspaceFolder.uri);
  if (!(await pathExists(elfFilePath))) {
    throw fileNotFound(elfFilePath, {
      userMessage:
        "Project ELF file not found at {filePath}. Build your project first.",
      logMessage: "Monitor blocked: project ELF file not found: {filePath}.",
      actions: [
        {
          label: "Build",
          execute: () => commands.executeCommand("espIdf.buildDevice"),
        },
      ],
    });
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
