/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th June 2026 6:03:16 pm
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

import { ErrorSeverity, NotificationButton } from "../customNotifications";

/**
 * Unique identifier for each known error scenario.
 * Add new entries here as you discover new failure modes.
 */
export enum ErrorCode {
  // File-related
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  FILE_PERMISSION_DENIED = "FILE_PERMISSION_DENIED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",

  // Workspace-related
  NO_WORKSPACE_OPEN = "NO_WORKSPACE_OPEN",
  NO_ACTIVE_EDITOR = "NO_ACTIVE_EDITOR",
  EnvironmentNotSupported = "EnvironmentNotSupported",
  InvalidCommandInvocation = "InvalidCommandInvocation",

  // Configuration-related
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  MISSING_DEPENDENCY = "MISSING_DEPENDENCY",
  EspIdfSettingsRemovalFailed = "EspIdfSettingsRemovalFailed",

  // Parse-related
  PARSE_ERROR = "PARSE_ERROR",

  // Task-related
  TaskFailed = "TaskFailed",
  TaskFailedWithOutput = "TaskFailedWithOutput",

  // Build
  AlreadyBuilding = "AlreadyBuilding",
  IdfToolNotFound = "IdfToolNotFound",
  IdfTargetNotSet = "IdfTargetNotSet",
  InvalidIdfVersion = "InvalidIdfVersion",
  IdfVersionTooLow = "IdfVersionTooLow",
  InvalidIdfTarget = "InvalidIdfTarget",
  BuildTerminated = "BuildTerminated",
  FlashInProgress = "FlashInProgress",
  ToolchainNotFound = "ToolchainNotFound",
  DfuTargetNotCompatible = "DfuTargetNotCompatible",
  NoBuildDirToClean = "NoBuildDirToClean",
  CMakeCacheNotFound = "CMakeCacheNotFound",

  // Flash
  FlashEncryptionValidationFailed = "FlashEncryptionValidationFailed",
  AlreadyFlashing = "AlreadyFlashing",
  FlashTerminated = "FlashTerminated",
  IdfTaskInProgress = "IdfTaskInProgress",
  BuildRequiredBeforeFlash = "BuildRequiredBeforeFlash",
  FlasherArgsMissing = "FlasherArgsMissing",
  NoSerialPort = "NoSerialPort",
  NoSerialPortsAvailable = "NoSerialPortsAvailable",
  NoPortSelected = "NoPortSelected",
  NoBaudRateSelected = "NoBaudRateSelected",
  FlashTypeNotSelected = "FlashTypeNotSelected",
  NoDfuDeviceFound = "NoDfuDeviceFound",
  NoDfuDeviceSelected = "NoDfuDeviceSelected",
  NoDfuDevicePathFound = "NoDfuDevicePathFound",
  SectionBinNotAccessible = "SectionBinNotAccessible",
  EsptoolNotAccessible = "EsptoolNotAccessible",

  // OpenOCD / JTAG
  OpenOcdLaunchDeclined = "OpenOcdLaunchDeclined",
  OpenOcdNotRunning = "OpenOcdNotRunning",
  OpenOcdNotReady = "OpenOcdNotReady",
  OpenOcdVersionTooLow = "OpenOcdVersionTooLow",
  OpenOcdStartFailed = "OpenOcdStartFailed",
  OpenOcdProcessExited = "OpenOcdProcessExited",
  OpenOcdNoBoardsForTarget = "OpenOcdNoBoardsForTarget",
  OpenOcdBoardSelectionFailed = "OpenOcdBoardSelectionFailed",
  OpenOcdHintsLoadFailed = "OpenOcdHintsLoadFailed",

  // Tracing
  TraceTclFailed = "TraceTclFailed",
  HeapTraceNotSupported = "HeapTraceNotSupported",
  TraceGdbProcessFailed = "TraceGdbProcessFailed",
  TraceInvalidCommand = "TraceInvalidCommand",

  // Erase flash
  AlreadyErasing = "AlreadyErasing",
  EraseInProgress = "EraseInProgress",
  EraseTerminated = "EraseTerminated",
  EraseBlockedBySecureConfig = "EraseBlockedBySecureConfig",

  // Menuconfig
  ConfserverProcessFailed = "ConfserverProcessFailed",
  ConfserverProtocolError = "ConfserverProtocolError",

  // Monitor
  MonitorWsPortInUse = "MonitorWsPortInUse",
  MonitorWsPortNotConfigured = "MonitorWsPortNotConfigured",
  WebsocketClientInstallFailed = "WebsocketClientInstallFailed",
  MonitorCoreDumpElfGenerationFailed = "MonitorCoreDumpElfGenerationFailed",
  MonitorDebugLaunchFailed = "MonitorDebugLaunchFailed",

  // QEMU
  QemuTargetNotSupported = "QemuTargetNotSupported",
  QemuLaunchArgsMissing = "QemuLaunchArgsMissing",
  QemuDebugLaunchFailed = "QemuDebugLaunchFailed",

  // Coverage
  CoverageGcovDataFailed = "CoverageGcovDataFailed",

  // Partition table
  PartitionSdkconfigRequired = "PartitionSdkconfigRequired",
  PartitionCustomTableNotEnabled = "PartitionCustomTableNotEnabled",
  PartitionTableFilenameEmpty = "PartitionTableFilenameEmpty",
  PartitionPopulateFailed = "PartitionPopulateFailed",
  PartitionInvalidSizeFormat = "PartitionInvalidSizeFormat",
  PartitionFlashFailed = "PartitionFlashFailed",
  PartitionReadFailed = "PartitionReadFailed",

  // Unit test
  UnitTestTaskFailed = "UnitTestTaskFailed",

  // New project
  NewProjectWizardFailed = "NewProjectWizardFailed",
  ProjectScaffoldFailed = "ProjectScaffoldFailed",
  ImportProjectFailed = "ImportProjectFailed",

  // Rainmaker
  RainmakerLoginFailed = "RainmakerLoginFailed",
  RainmakerNodeDeleteFailed = "RainmakerNodeDeleteFailed",
  RainmakerParamUpdateFailed = "RainmakerParamUpdateFailed",

  // eFuse
  EfuseSummaryFailed = "EfuseSummaryFailed",

  // EIM
  EimDownloadCanceled = "EimDownloadCanceled",
  EimDownloadFailed = "EimDownloadFailed",
  EimAssetNotFound = "EimAssetNotFound",

  // Repository cloning
  RepositoryCloneFailed = "RepositoryCloneFailed",
}

/**
 * Full descriptor of a known error, including how to present it
 * and what recovery actions are available.
 */
export interface KnownErrorDescriptor {
  code: ErrorCode;
  severity: ErrorSeverity;
  /** User-friendly message shown in the notification */
  userMessage: string;
  /** Detailed message for logging */
  logMessage: string;
  /** Recovery actions offered to the user */
  actions: NotificationButton[];
  /** When set, user message is also written to this output channel category */
  outputChannel?: string;
}

/**
 * Optional call-site overrides for how a KnownError is presented.
 * Applied on top of the global registry defaults.
 */
export type ErrorPresentation = Partial<Omit<KnownErrorDescriptor, "code">>;

/**
 * Thin command-level defaults (not per-code message maps).
 * Used when the resolved descriptor omits outputChannel.
 */
export type HandleErrorOptions = {
  outputChannel?: string;
};
