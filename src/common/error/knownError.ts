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

import { ErrorCode, ErrorPresentation } from "./types";

/**
 * Base class for all known/expected errors in the extension.
 * Defaults live in error/registry.ts; optional {@link presentation} overrides
 * them at the throw site. {@link message} is a technical fallback.
 */
export class KnownError extends Error {
  public readonly isKnownError = true as const;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly presentation?: ErrorPresentation
  ) {
    super(message);
    this.name = "KnownError";
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

const MESSAGE_VALUE_MAX_LENGTH = 200;
const MESSAGE_MAX_LENGTH = 1000;

/**
 * Captured process output can be megabytes long. It is kept in
 * {@link KnownError.metadata} and replaced by a size marker in the message so
 * the message (and the stack that embeds it) stays short and stable enough for
 * telemetry deduplication.
 */
function summarizeMetadataValue(value: unknown): unknown {
  if (typeof value === "string" && value.length > MESSAGE_VALUE_MAX_LENGTH) {
    return `[${value.length} chars]`;
  }
  return value;
}

function formatTechnicalMessage(
  code: ErrorCode,
  metadata?: Record<string, unknown>
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return `[${code}]`;
  }
  const summarized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    summarized[key] = summarizeMetadataValue(value);
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(summarized) ?? "";
  } catch {
    serialized = "[unserializable metadata]";
  }
  if (serialized.length > MESSAGE_MAX_LENGTH) {
    serialized = `${serialized.slice(0, MESSAGE_MAX_LENGTH)}…`;
  }
  return `[${code}] ${serialized}`;
}

export function known(
  code: ErrorCode,
  metadata?: Record<string, unknown>,
  presentation?: ErrorPresentation
): KnownError {
  return new KnownError(
    code,
    formatTechnicalMessage(code, metadata),
    metadata,
    presentation
  );
}

export function idfToolNotFound(
  toolName: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.IdfToolNotFound, { toolName }, presentation);
}

export function fileNotFound(
  filePath: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.FILE_NOT_FOUND, { filePath }, presentation);
}

export function filePermissionDenied(
  filePath: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.FILE_PERMISSION_DENIED, { filePath }, presentation);
}

export function invalidConfiguration(
  setting: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.INVALID_CONFIGURATION, { setting }, presentation);
}

export function missingDependency(
  dependency: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.MISSING_DEPENDENCY, { dependency }, presentation);
}

export function noWorkspaceOpen(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.NO_WORKSPACE_OPEN, undefined, presentation);
}

export function noActiveEditor(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.NO_ACTIVE_EDITOR, undefined, presentation);
}

export function noBuildDirToClean(
  buildDir?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.NoBuildDirToClean,
    buildDir ? { buildDir } : undefined,
    presentation
  );
}

export function cmakeCacheNotFound(
  buildDir: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.CMakeCacheNotFound, { buildDir }, presentation);
}

export function environmentNotSupported(
  envName: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EnvironmentNotSupported, { envName }, presentation);
}

export function invalidCommandInvocation(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.InvalidCommandInvocation,
    detail ? { detail } : undefined,
    presentation
  );
}

export function idfVersionTooLow(
  minVersion: string,
  currentVersion: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.IdfVersionTooLow,
    { minVersion, currentVersion },
    presentation
  );
}

export function toolchainNotFound(
  toolchain: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.ToolchainNotFound, { toolchain }, presentation);
}

export function parseError(
  filePath: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PARSE_ERROR, { filePath }, presentation);
}

export function alreadyBuilding(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.AlreadyBuilding, undefined, presentation);
}

export function buildTerminated(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.BuildTerminated, undefined, presentation);
}

export function dfuTargetNotCompatible(
  target: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.DfuTargetNotCompatible, { target }, presentation);
}

export function flashEncryptionValidationFailed(
  resultType?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.FlashEncryptionValidationFailed,
    resultType ? { resultType } : undefined,
    presentation
  );
}

export function espIdfSettingsRemovalFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EspIdfSettingsRemovalFailed, { detail }, presentation);
}

export function flashInProgress(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.FlashInProgress, undefined, presentation);
}

export function alreadyFlashing(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.AlreadyFlashing, undefined, presentation);
}

export function flashTerminated(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.FlashTerminated, undefined, presentation);
}

export function idfTaskInProgress(
  taskName: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.IdfTaskInProgress, { taskName }, presentation);
}

export const IdfTaskName = {
  Build: "build",
  Flash: "flash",
  EraseFlash: "erase flash",
  Monitor: "monitor",
  SetTarget: "set target",
} as const;

export function idfTargetNotSet(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.IdfTargetNotSet, undefined, presentation);
}

export function invalidIdfVersion(
  idfPath: string,
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.InvalidIdfVersion,
    detail ? { idfPath, detail } : { idfPath },
    presentation
  );
}

export function invalidIdfTarget(
  target: string,
  supportedTargets: string[],
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.InvalidIdfTarget,
    {
      target,
      supportedTargets: supportedTargets.join(", "),
    },
    presentation
  );
}

export function buildRequiredBeforeFlash(
  buildDirPath: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.BuildRequiredBeforeFlash,
    { buildDirPath },
    presentation
  );
}

export function flasherArgsMissing(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.FlasherArgsMissing, undefined, presentation);
}

export function noSerialPort(
  idfTarget: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.NoSerialPort, { idfTarget }, presentation);
}

export function noSerialPortsAvailable(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.NoSerialPortsAvailable, undefined, presentation);
}

export function noPortSelected(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.NoPortSelected, undefined, presentation);
}

export function noBaudRateSelected(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.NoBaudRateSelected, undefined, presentation);
}

export function flashTypeNotSelected(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.FlashTypeNotSelected, undefined, presentation);
}

export function noDfuDeviceFound(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.NoDfuDeviceFound, undefined, presentation);
}

export function noDfuDeviceSelected(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.NoDfuDeviceSelected, undefined, presentation);
}

export function noDfuDevicePathFound(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.NoDfuDevicePathFound, undefined, presentation);
}

export function sectionBinNotAccessible(
  binFilePath: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.SectionBinNotAccessible,
    { binFilePath },
    presentation
  );
}

export function esptoolNotAccessible(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EsptoolNotAccessible, undefined, presentation);
}

export function openOcdLaunchDeclined(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.OpenOcdLaunchDeclined, undefined, presentation);
}

export function openOcdNotRunning(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.OpenOcdNotRunning, undefined, presentation);
}

export function openOcdNotReady(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.OpenOcdNotReady, undefined, presentation);
}

export function openOcdVersionTooLow(
  currentVersion: string,
  minVersion: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.OpenOcdVersionTooLow,
    { currentVersion, minVersion },
    presentation
  );
}

export function openOcdStartFailed(
  detail: string,
  metadata?: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
  },
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.OpenOcdStartFailed,
    { detail, ...metadata },
    presentation
  );
}

export function openOcdProcessExited(
  exitCode: number,
  metadata?: {
    stdout?: string;
    stderr?: string;
  },
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.OpenOcdProcessExited,
    { exitCode, ...metadata },
    presentation
  );
}

export function openOcdNoBoardsForTarget(
  target: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.OpenOcdNoBoardsForTarget, { target }, presentation);
}

export function openOcdBoardSelectionFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.OpenOcdBoardSelectionFailed, { detail }, presentation);
}

export function openOcdHintsLoadFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.OpenOcdHintsLoadFailed, { detail }, presentation);
}

export type TraceTclPhase = "reset" | "start" | "status" | "stop";

export function traceTclFailed(
  detail: string,
  phase: TraceTclPhase = "start",
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.TraceTclFailed, { detail, phase }, presentation);
}

export function heapTraceNotSupported(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.HeapTraceNotSupported, undefined, presentation);
}

export function traceGdbProcessFailed(
  metadata?: {
    exitCode?: number;
    detail?: string;
  },
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.TraceGdbProcessFailed, metadata, presentation);
}

export function traceInvalidCommand(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.TraceInvalidCommand, undefined, presentation);
}

export function alreadyErasing(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.AlreadyErasing, undefined, presentation);
}

export function eraseInProgress(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.EraseInProgress, undefined, presentation);
}

export function eraseTerminated(presentation?: ErrorPresentation): KnownError {
  return known(ErrorCode.EraseTerminated, undefined, presentation);
}

export function eraseBlockedBySecureConfig(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EraseBlockedBySecureConfig, undefined, presentation);
}

export function monitorWsPortInUse(
  wsPort: number,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.MonitorWsPortInUse, { wsPort }, presentation);
}

export function monitorWsPortNotConfigured(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.MonitorWsPortNotConfigured, undefined, presentation);
}

export function websocketClientInstallFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.WebsocketClientInstallFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function monitorCoreDumpElfGenerationFailed(
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.MonitorCoreDumpElfGenerationFailed,
    undefined,
    presentation
  );
}

export function monitorDebugLaunchFailed(
  context: "gdb_stub" | "core_dump",
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.MonitorDebugLaunchFailed,
    detail ? { context, detail } : { context },
    presentation
  );
}

export type ConfserverProcessPhase = "startup" | "reconfigure" | "runtime";

export function confserverProcessFailed(
  phase: ConfserverProcessPhase,
  metadata?: {
    exitCode?: number;
    signal?: string | null;
    detail?: string;
    stdout?: string;
    stderr?: string;
  },
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.ConfserverProcessFailed,
    { phase, ...metadata },
    presentation
  );
}

export function confserverProtocolError(
  detail: string,
  metadata?: {
    stdout?: string;
    stderr?: string;
    lastRequest?: string;
  },
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.ConfserverProtocolError,
    { detail, ...metadata },
    presentation
  );
}

export function efuseSummaryFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.EfuseSummaryFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function eimDownloadCanceled(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EimDownloadCanceled, undefined, presentation);
}

export function eimDownloadFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EimDownloadFailed, { detail }, presentation);
}

export function eimAssetNotFound(
  assetName: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.EimAssetNotFound, { assetName }, presentation);
}

export function repositoryCloneFailed(
  repoName: string,
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.RepositoryCloneFailed,
    detail ? { repoName, detail } : { repoName },
    presentation
  );
}

export function newProjectWizardFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.NewProjectWizardFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function projectScaffoldFailed(
  operation: string,
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.ProjectScaffoldFailed,
    detail ? { operation, detail } : { operation },
    presentation
  );
}

export function importProjectFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.ImportProjectFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function rainmakerLoginFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.RainmakerLoginFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function rainmakerNodeDeleteFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.RainmakerNodeDeleteFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function rainmakerParamUpdateFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.RainmakerParamUpdateFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function qemuTargetNotSupported(
  target: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.QemuTargetNotSupported, { target }, presentation);
}

export function qemuLaunchArgsMissing(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.QemuLaunchArgsMissing, undefined, presentation);
}

export function qemuDebugLaunchFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.QemuDebugLaunchFailed, { detail }, presentation);
}

export function coverageGcovDataFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.CoverageGcovDataFailed,
    detail ? { detail } : undefined,
    presentation
  );
}

export function partitionSdkconfigRequired(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PartitionSdkconfigRequired, undefined, presentation);
}

export function partitionCustomTableNotEnabled(
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.PartitionCustomTableNotEnabled,
    undefined,
    presentation
  );
}

export function partitionTableFilenameEmpty(
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PartitionTableFilenameEmpty, undefined, presentation);
}

export function partitionPopulateFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PartitionPopulateFailed, { detail }, presentation);
}

export function partitionInvalidSizeFormat(
  size: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PartitionInvalidSizeFormat, { size }, presentation);
}

export function partitionFlashFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PartitionFlashFailed, { detail }, presentation);
}

export function partitionReadFailed(
  detail: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(ErrorCode.PartitionReadFailed, { detail }, presentation);
}

export function unitTestTaskFailed(
  detail?: string,
  presentation?: ErrorPresentation
): KnownError {
  return known(
    ErrorCode.UnitTestTaskFailed,
    detail ? { detail } : undefined,
    presentation
  );
}
