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
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Workspace-related
  NO_WORKSPACE_OPEN = 'NO_WORKSPACE_OPEN',
  NO_ACTIVE_EDITOR = 'NO_ACTIVE_EDITOR',

  // Configuration-related
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',

  // Parse-related
  PARSE_ERROR = 'PARSE_ERROR',

  // Task-related
  TaskFailed = 'TaskFailed',
  TaskFailedWithOutput = 'TaskFailedWithOutput',

  // Build
  AlreadyBuilding = 'AlreadyBuilding',
  IdfToolNotFound = 'IdfToolNotFound',
  IdfTargetNotSet = 'IdfTargetNotSet',
  InvalidIdfVersion = 'InvalidIdfVersion',
  BuildTerminated = 'BuildTerminated',
  FlashInProgress = 'FlashInProgress',
  ToolchainNotFound = 'ToolchainNotFound',

  // Flash
  AlreadyFlashing = 'AlreadyFlashing',
  FlashTerminated = 'FlashTerminated',
  IdfTaskInProgress = 'IdfTaskInProgress',
  BuildRequiredBeforeFlash = 'BuildRequiredBeforeFlash',
  FlasherArgsMissing = 'FlasherArgsMissing',
  NoSerialPort = 'NoSerialPort',
  NoPortSelected = 'NoPortSelected',
  NoBaudRateSelected = 'NoBaudRateSelected',
  NoDfuDeviceFound = 'NoDfuDeviceFound',
  NoDfuDeviceSelected = 'NoDfuDeviceSelected',
  NoDfuDevicePathFound = 'NoDfuDevicePathFound',
  SectionBinNotAccessible = 'SectionBinNotAccessible',
  EsptoolNotAccessible = 'EsptoolNotAccessible',

  // OpenOCD / JTAG
  OpenOcdLaunchDeclined = 'OpenOcdLaunchDeclined',
  OpenOcdNotRunning = 'OpenOcdNotRunning',
  OpenOcdNotReady = 'OpenOcdNotReady',
  OpenOcdVersionTooLow = 'OpenOcdVersionTooLow',
  OpenOcdStartFailed = 'OpenOcdStartFailed',
  OpenOcdProcessExited = 'OpenOcdProcessExited',
  OpenOcdNoBoardsForTarget = 'OpenOcdNoBoardsForTarget',
  OpenOcdBoardSelectionFailed = 'OpenOcdBoardSelectionFailed',
  OpenOcdHintsLoadFailed = 'OpenOcdHintsLoadFailed',

  // Tracing
  TraceTclFailed = 'TraceTclFailed',
  HeapTraceNotSupported = 'HeapTraceNotSupported',
  TraceGdbProcessFailed = 'TraceGdbProcessFailed',
  TraceInvalidCommand = 'TraceInvalidCommand',

  // Erase flash
  AlreadyErasing = 'AlreadyErasing',
  EraseInProgress = 'EraseInProgress',
  EraseTerminated = 'EraseTerminated',
  EraseBlockedBySecureConfig = 'EraseBlockedBySecureConfig',

  // Menuconfig
  ConfserverProcessFailed = 'ConfserverProcessFailed',
  ConfserverProtocolError = 'ConfserverProtocolError',

  // Monitor
  MonitorWsPortInUse = 'MonitorWsPortInUse',
  MonitorWsPortNotConfigured = 'MonitorWsPortNotConfigured',
  WebsocketClientInstallFailed = 'WebsocketClientInstallFailed',
  MonitorCoreDumpElfGenerationFailed = 'MonitorCoreDumpElfGenerationFailed',
  MonitorDebugLaunchFailed = 'MonitorDebugLaunchFailed',
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
 * Per-command overrides for specific error codes.
 * Allows the same ErrorCode to have different messages/actions
 * depending on which command triggered it.
 */
export type CommandErrorMapping = Partial<
  Record<ErrorCode, Omit<KnownErrorDescriptor, 'code'>>
>;