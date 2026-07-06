/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th June 2026 6:39:51 pm
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

import { ErrorCode } from "./types";

/**
 * Base class for all known/expected errors in the extension.
 * User-facing text lives in error/registry.ts; {@link message} is a technical
 * fallback for logs and unregistered codes.
 */
export class KnownError extends Error {
  public readonly isKnownError = true as const;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'KnownError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Type guard: is this a KnownError?
 */
export function isKnownError(error: unknown): error is KnownError {
  return (
    error instanceof KnownError ||
    (error instanceof Error && (error as any).isKnownError === true)
  );
}

function formatTechnicalMessage(
  code: ErrorCode,
  metadata?: Record<string, unknown>
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return `[${code}]`;
  }
  return `[${code}] ${JSON.stringify(metadata)}`;
}

export function known(
  code: ErrorCode,
  metadata?: Record<string, unknown>
): KnownError {
  return new KnownError(code, formatTechnicalMessage(code, metadata), metadata);
}

export function idfToolNotFound(toolName: string): KnownError {
  return known(ErrorCode.IdfToolNotFound, { toolName });
}

export function fileNotFound(filePath: string): KnownError {
  return known(ErrorCode.FILE_NOT_FOUND, { filePath });
}

export function filePermissionDenied(filePath: string): KnownError {
  return known(ErrorCode.FILE_PERMISSION_DENIED, { filePath });
}

export function invalidConfiguration(setting: string): KnownError {
  return known(ErrorCode.INVALID_CONFIGURATION, { setting });
}

export function missingDependency(dependency: string): KnownError {
  return known(ErrorCode.MISSING_DEPENDENCY, { dependency });
}

export function parseError(filePath: string): KnownError {
  return known(ErrorCode.PARSE_ERROR, { filePath });
}

export function alreadyBuilding(): KnownError {
  return known(ErrorCode.AlreadyBuilding);
}

export function buildTerminated(): KnownError {
  return known(ErrorCode.BuildTerminated);
}

export function flashInProgress(): KnownError {
  return known(ErrorCode.FlashInProgress);
}

export function alreadyFlashing(): KnownError {
  return known(ErrorCode.AlreadyFlashing);
}

export function flashTerminated(): KnownError {
  return known(ErrorCode.FlashTerminated);
}

export function idfTaskInProgress(taskName: string): KnownError {
  return known(ErrorCode.IdfTaskInProgress, { taskName });
}

export const IdfTaskName = {
  Build: "build",
  Flash: "flash",
  EraseFlash: "erase flash",
  Monitor: "monitor",
} as const;

export function idfTargetNotSet(): KnownError {
  return known(ErrorCode.IdfTargetNotSet);
}

export function invalidIdfVersion(
  idfPath: string,
  detail?: string
): KnownError {
  return known(
    ErrorCode.InvalidIdfVersion,
    detail ? { idfPath, detail } : { idfPath }
  );
}

export function buildRequiredBeforeFlash(buildDirPath: string): KnownError {
  return known(ErrorCode.BuildRequiredBeforeFlash, { buildDirPath });
}

export function flasherArgsMissing(): KnownError {
  return known(ErrorCode.FlasherArgsMissing);
}

export function noSerialPort(idfTarget: string): KnownError {
  return known(ErrorCode.NoSerialPort, { idfTarget });
}

export function noPortSelected(): KnownError {
  return known(ErrorCode.NoPortSelected);
}

export function noBaudRateSelected(): KnownError {
  return known(ErrorCode.NoBaudRateSelected);
}

export function noDfuDeviceFound(): KnownError {
  return known(ErrorCode.NoDfuDeviceFound);
}

export function noDfuDeviceSelected(): KnownError {
  return known(ErrorCode.NoDfuDeviceSelected);
}

export function noDfuDevicePathFound(): KnownError {
  return known(ErrorCode.NoDfuDevicePathFound);
}

export function sectionBinNotAccessible(binFilePath: string): KnownError {
  return known(ErrorCode.SectionBinNotAccessible, { binFilePath });
}

export function esptoolNotAccessible(): KnownError {
  return known(ErrorCode.EsptoolNotAccessible);
}

export function openOcdLaunchDeclined(): KnownError {
  return known(ErrorCode.OpenOcdLaunchDeclined);
}

export function openOcdNotRunning(): KnownError {
  return known(ErrorCode.OpenOcdNotRunning);
}

export function openOcdNotReady(): KnownError {
  return known(ErrorCode.OpenOcdNotReady);
}

export function openOcdVersionTooLow(
  currentVersion: string,
  minVersion: string
): KnownError {
  return known(ErrorCode.OpenOcdVersionTooLow, { currentVersion, minVersion });
}

export function alreadyErasing(): KnownError {
  return known(ErrorCode.AlreadyErasing);
}

export function eraseInProgress(): KnownError {
  return known(ErrorCode.EraseInProgress);
}

export function eraseTerminated(): KnownError {
  return known(ErrorCode.EraseTerminated);
}

export function eraseBlockedBySecureConfig(): KnownError {
  return known(ErrorCode.EraseBlockedBySecureConfig);
}

export function monitorWsPortInUse(wsPort: number): KnownError {
  return known(ErrorCode.MonitorWsPortInUse, { wsPort });
}

export function monitorWsPortNotConfigured(): KnownError {
  return known(ErrorCode.MonitorWsPortNotConfigured);
}

export function websocketClientInstallFailed(detail?: string): KnownError {
  return known(
    ErrorCode.WebsocketClientInstallFailed,
    detail ? { detail } : undefined
  );
}

export function monitorCoreDumpElfGenerationFailed(): KnownError {
  return known(ErrorCode.MonitorCoreDumpElfGenerationFailed);
}

export function monitorDebugLaunchFailed(
  context: "gdb_stub" | "core_dump",
  detail?: string
): KnownError {
  return known(
    ErrorCode.MonitorDebugLaunchFailed,
    detail ? { context, detail } : { context }
  );
}

export type ConfserverProcessPhase = "startup" | "reconfigure" | "runtime";

export function confserverProcessFailed(
  phase: ConfserverProcessPhase,
  metadata?: {
    exitCode?: number;
    signal?: string | null;
    detail?: string;
  }
): KnownError {
  return known(ErrorCode.ConfserverProcessFailed, { phase, ...metadata });
}

export function confserverProtocolError(detail: string): KnownError {
  return known(ErrorCode.ConfserverProtocolError, { detail });
}
