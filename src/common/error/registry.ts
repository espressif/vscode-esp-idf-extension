/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 26th June 2026 6:01:46 pm
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

import { commands, env, Uri, window } from "vscode";
import {
  ErrorCode,
  KnownErrorDescriptor,
} from "./types";
import { ErrorSeverity } from "../customNotifications";
import { OutputChannel } from "../outputChannel";
import { ESP } from "../../config";

/**
 * Global registry of default descriptors for each known error code.
 * Call sites may override presentation via KnownError.presentation.
 *
 * When adding a new error: (1) add ErrorCode, (2) register defaults here,
 * (3) add a known() factory (metadata + optional presentation override).
 */
const errorRegistry = new Map<ErrorCode, KnownErrorDescriptor>();

export function registerNewErrorInRegistry(descriptor: KnownErrorDescriptor): void {
  errorRegistry.set(descriptor.code, descriptor);
}

// ──────────────────────────── Task errors ────────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.TaskFailed,
  severity: ErrorSeverity.Error,
  userMessage: "A task failed during execution. Please check the output for details.",
  logMessage: "Task execution failed. See terminal output for more information.",
  actions: [
    {
      label: "View Terminal Output",
      execute: () => commands.executeCommand("workbench.action.terminal.focus"),
    },
  ],
});

// ──────────────────────────── Build errors ────────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.AlreadyBuilding,
  severity: ErrorSeverity.Warning,
  userMessage: "Wait for ESP-IDF build to finish",
  logMessage: "Attempted to start a build while another build is in progress.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.NoBuildDirToClean,
  severity: ErrorSeverity.Warning,
  userMessage: "There is no build directory to clean, exiting!",
  logMessage: "Full clean blocked: build directory does not exist.",
  actions: [],
  outputChannel: "ESP-IDF",
});

registerNewErrorInRegistry({
  code: ErrorCode.CMakeCacheNotFound,
  severity: ErrorSeverity.Warning,
  userMessage:
    "There is no CMakeCache.txt. Please try to delete the build directory manually.",
  logMessage: "Full clean blocked: CMakeCache.txt missing in {buildDir}.",
  actions: [],
  outputChannel: "ESP-IDF",
});

registerNewErrorInRegistry({
  code: ErrorCode.IdfToolNotFound,
  severity: ErrorSeverity.Error,
  userMessage:
    "{toolName} was not found. Please install {toolName} and ensure it's in your PATH.",
  logMessage: "{toolName} executable not found.",
  actions: [
    {
      label: "Open ESP-IDF Install Manager",
      execute: () => commands.executeCommand("espIdf.installManager"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.IdfTargetNotSet,
  severity: ErrorSeverity.Error,
  userMessage:
    'IDF target is not set.',
  logMessage: "IDF_TARGET is not set in the environment variables.",
  actions: [
    {
      label: "Set Target",
      execute: () => commands.executeCommand("espIdf.setTarget"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.InvalidIdfVersion,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to read ESP-IDF version from {idfPath}.",
  logMessage: "Failed to read ESP-IDF version from {idfPath}: {detail}.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.IdfVersionTooLow,
  severity: ErrorSeverity.Error,
  userMessage:
    "Selected command needs ESP-IDF v{minVersion} or higher (current: {currentVersion}).",
  logMessage:
    "ESP-IDF version {currentVersion} is below required minimum {minVersion}.",
  actions: [
    {
      label: "Open ESP-IDF Install Manager",
      execute: () => commands.executeCommand("espIdf.installManager"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.ToolchainNotFound,
  severity: ErrorSeverity.Error,
  userMessage:
    "Toolchain {toolchain} was not found. Please install it and ensure it is in your PATH.",
  logMessage: "Toolchain {toolchain} executable not found.",
  actions: [
    {
      label: "Open ESP-IDF Install Manager",
      execute: () => commands.executeCommand("espIdf.installManager"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.InvalidIdfTarget,
  severity: ErrorSeverity.Error,
  userMessage:
    '"{target}" is not a supported IDF target. Supported targets: {supportedTargets}.',
  logMessage:
    'Invalid IDF target "{target}". Supported targets: {supportedTargets}.',
  actions: [
    {
      label: "Set Target",
      execute: () => commands.executeCommand("espIdf.setTarget"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.BuildTerminated,
  severity: ErrorSeverity.Warning,
  userMessage: "Build was terminated.",
  logMessage: "Build was terminated by user cancellation.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.FlashInProgress,
  severity: ErrorSeverity.Warning,
  userMessage: "Wait for ESP-IDF flash to finish before building.",
  logMessage: "Attempted to build while a flash operation is in progress.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.TaskFailedWithOutput,
  severity: ErrorSeverity.Error,
  userMessage:
    "Build task failed. Check the terminal output for details.",
  logMessage: "Build task failed with captured output.",
  actions: [
    {
      label: "View Terminal Output",
      execute: () => commands.executeCommand("workbench.action.terminal.focus"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.ChildProcessFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Command failed. Check the output for details.",
  logMessage: "Child process failed with captured output.",
  actions: [
    {
      label: "View Output",
      execute: () => OutputChannel.show(),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.DfuTargetNotCompatible,
  severity: ErrorSeverity.Warning,
  userMessage:
    'The selected device target "{target}" is not compatible for DFU, as a result the dfu.bin was not created.',
  logMessage: 'IDF target "{target}" is not compatible with DFU build.',
  actions: [
    {
      label: "Set Target",
      execute: () => commands.executeCommand("espIdf.setTarget"),
    },
  ],
});

// ──────────────────────────── Flash errors ───────────────────────────

const flashOutputChannel = "Flash";

registerNewErrorInRegistry({
  code: ErrorCode.FlashEncryptionValidationFailed,
  severity: ErrorSeverity.Info,
  userMessage:
    "Flash encryption validation did not pass. See the Flash Encryption output for details.",
  logMessage:
    "Flash encryption validation failed ({resultType}). Details were shown in the Flash Encryption output.",
  actions: [],
  outputChannel: "Flash Encryption",
});

registerNewErrorInRegistry({
  code: ErrorCode.AlreadyFlashing,
  severity: ErrorSeverity.Warning,
  userMessage: "Already one flash process is running!",
  logMessage: "Attempted to start a flash while another flash is in progress.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.FlashTerminated,
  severity: ErrorSeverity.Warning,
  userMessage: "Flashing has been stopped!",
  logMessage: "Flash was terminated by user cancellation.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.IdfTaskInProgress,
  severity: ErrorSeverity.Warning,
  userMessage: "Wait for ESP-IDF {taskName} to finish.",
  logMessage: "Attempted to start a task while {taskName} is in progress.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.BuildRequiredBeforeFlash,
  severity: ErrorSeverity.Error,
  userMessage:
    "Build is required before Flashing, {buildDirPath} can't be accessed",
  logMessage: "Flash blocked: build directory not accessible: {buildDirPath}.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.FlasherArgsMissing,
  severity: ErrorSeverity.Warning,
  userMessage:
    "flasher_args.json file is missing from the build directory, can't proceed, please build properly!",
  logMessage: "flasher_args.json missing from build directory.",
  actions: [
    {
      label: "Build",
      execute: () => commands.executeCommand("espIdf.buildDevice"),
    },
  ],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.NoSerialPort,
  severity: ErrorSeverity.Warning,
  userMessage: "No serial port found for current IDF_TARGET: {idfTarget}",
  logMessage: "No serial port found for IDF_TARGET {idfTarget}.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.NoSerialPortsAvailable,
  severity: ErrorSeverity.Warning,
  userMessage: "No serial ports found.",
  logMessage: "No serial ports found on this system.",
  actions: [],
  outputChannel: "Serial port",
});

registerNewErrorInRegistry({
  code: ErrorCode.NoPortSelected,
  severity: ErrorSeverity.Error,
  userMessage: "Select a serial port.",
  logMessage: "No serial port selected.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.NoBaudRateSelected,
  severity: ErrorSeverity.Error,
  userMessage: "Select a baud rate before flashing",
  logMessage: "Flash blocked: no flash baud rate configured.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.FlashTypeNotSelected,
  severity: ErrorSeverity.Error,
  userMessage: "Select a flash method before flashing.",
  logMessage: "Flash blocked: idf.flashType is not configured.",
  actions: [
    {
      label: "Select Flash Method",
      execute: () => commands.executeCommand("espIdf.selectFlashMethod"),
    },
  ],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.NoDfuDeviceFound,
  severity: ErrorSeverity.Error,
  userMessage: "No DFU capable USB device available found",
  logMessage: "No DFU-capable USB device found.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.NoDfuDeviceSelected,
  severity: ErrorSeverity.Info,
  userMessage: "No DFU was selected",
  logMessage: "DFU flash cancelled: no device selected.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.NoDfuDevicePathFound,
  severity: ErrorSeverity.Error,
  userMessage: "No DFU device path found",
  logMessage: "DFU device path could not be resolved from selection.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.SectionBinNotAccessible,
  severity: ErrorSeverity.Error,
  userMessage:
    "Flash binary file {binFilePath} doesn't exist or can't be accessed!",
  logMessage:
    "Flash binary section file {binFilePath} is missing or not readable.",
  actions: [],
  outputChannel: flashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.EsptoolNotAccessible,
  severity: ErrorSeverity.Error,
  userMessage:
    "Make sure you have the esptool.py installed and set in $PATH with proper permission",
  logMessage: "esptool.py is missing or not accessible.",
  actions: [],
  outputChannel: flashOutputChannel,
});

// ──────────────────────────── Erase flash errors ─────────────────────

const eraseFlashOutputChannel = "Erase flash";

registerNewErrorInRegistry({
  code: ErrorCode.AlreadyErasing,
  severity: ErrorSeverity.Warning,
  userMessage: "An erase-flash operation is already in progress.",
  logMessage: "Attempted to start erase flash while another erase is in progress.",
  actions: [],
  outputChannel: eraseFlashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.EraseInProgress,
  severity: ErrorSeverity.Warning,
  userMessage: "Wait for erase flash to finish before building or flashing.",
  logMessage: "Attempted build or flash while erase flash is in progress.",
  actions: [],
  outputChannel: eraseFlashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.EraseTerminated,
  severity: ErrorSeverity.Warning,
  userMessage: "Erase flash has been stopped!",
  logMessage: "Erase flash was terminated by user cancellation.",
  actions: [],
  outputChannel: eraseFlashOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.EraseBlockedBySecureConfig,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Flash encryption or secure boot is enabled. Erasing flash will permanently remove encryption keys and may render the device unusable.",
  logMessage: "Erase flash blocked: flash encryption or secure boot is enabled.",
  actions: [],
  outputChannel: eraseFlashOutputChannel,
});

// ──────────────────────────── Monitor errors ─────────────────────────

const monitorOutputChannel = "Monitor";

registerNewErrorInRegistry({
  code: ErrorCode.MonitorWsPortInUse,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Port {wsPort} is not available. Change idf.wssPort to use a different port.",
  logMessage: "WebSocket monitor port {wsPort} is already in use.",
  actions: [],
  outputChannel: monitorOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.MonitorWsPortNotConfigured,
  severity: ErrorSeverity.Error,
  userMessage: "WebSocket port (idf.wssPort) is not configured.",
  logMessage: "WebSocket monitor port (idf.wssPort) is not configured.",
  actions: [],
  outputChannel: monitorOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.WebsocketClientInstallFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to install websocket client dependencies.",
  logMessage: "Failed to install websocket_client: {detail}.",
  actions: [],
  outputChannel: monitorOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.MonitorCoreDumpElfGenerationFailed,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Failed to generate ELF from core dump. Close the core-dump monitor terminal manually.",
  logMessage: "Core dump ELF generation failed.",
  actions: [],
  outputChannel: monitorOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.MonitorDebugLaunchFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to launch debugger for postmortem ({context}).",
  logMessage: "Monitor postmortem debug launch failed ({context}): {detail}.",
  actions: [],
  outputChannel: monitorOutputChannel,
});

// ──────────────────────────── OpenOCD errors ─────────────────────────

const openOcdOutputChannel = "OpenOCD";

const launchOpenOcdAction = {
  label: "Launch OpenOCD",
  execute: () => commands.executeCommand("espIdf.openOCDCommand"),
};

const selectOpenOcdConfigsAction = {
  label: "Select Board Configs",
  execute: () => commands.executeCommand("espIdf.selectOpenOcdConfigFiles"),
};

const viewOpenOcdOutputAction = {
  label: "View OpenOCD Output",
  execute: () => OutputChannel.show(),
};

const openOcdTroubleshootingFaqAction = {
  label: "Troubleshooting FAQ",
  execute: () =>
    env.openExternal(Uri.parse(ESP.URL.OpenOcdTroubleshootingFaq)),
};

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdLaunchDeclined,
  severity: ErrorSeverity.Info,
  userMessage: "OpenOCD was not launched.",
  logMessage: "User declined to launch OpenOCD.",
  actions: [launchOpenOcdAction],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdNotRunning,
  severity: ErrorSeverity.Warning,
  userMessage: "OpenOCD server is not running.",
  logMessage: "OpenOCD server is not running after launch attempt.",
  actions: [launchOpenOcdAction],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdNotReady,
  severity: ErrorSeverity.Warning,
  userMessage: "OpenOCD is not ready to accept commands. Please try again.",
  logMessage: "OpenOCD TCL server did not become ready within retry limit.",
  actions: [launchOpenOcdAction],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdVersionTooLow,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Minimum OpenOCD version {minVersion} is required while you have {currentVersion} version installed",
  logMessage:
    "OpenOCD version {currentVersion} is below required minimum {minVersion}.",
  actions: [launchOpenOcdAction],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdStartFailed,
  severity: ErrorSeverity.Error,
  userMessage: "OpenOCD server failed to start: {detail}",
  logMessage: "OpenOCD server failed to start: {detail}",
  actions: [
    viewOpenOcdOutputAction,
    selectOpenOcdConfigsAction,
    openOcdTroubleshootingFaqAction,
  ],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdProcessExited,
  severity: ErrorSeverity.Error,
  userMessage: "OpenOCD exited with error code {exitCode}.",
  logMessage: "OpenOCD process exited with non-zero code {exitCode}.",
  actions: [
    viewOpenOcdOutputAction,
    openOcdTroubleshootingFaqAction,
  ],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdNoBoardsForTarget,
  severity: ErrorSeverity.Error,
  userMessage:
    "No OpenOCD boards found for target {target}. Check your OPENOCD_SCRIPTS environment variable.",
  logMessage: "No OpenOCD boards found for target {target}.",
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
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdBoardSelectionFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to select OpenOCD configuration files: {detail}",
  logMessage: "OpenOCD board selection failed: {detail}",
  actions: [selectOpenOcdConfigsAction],
  outputChannel: openOcdOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.OpenOcdHintsLoadFailed,
  severity: ErrorSeverity.Warning,
  userMessage: "Failed to load OpenOCD error hints: {detail}",
  logMessage: "OpenOCD hints load failed: {detail}",
  actions: [
    {
      label: "View Error Hints",
      execute: () => commands.executeCommand("espIdf.errorHints.focus"),
    },
  ],
  outputChannel: openOcdOutputChannel,
});

// ──────────────────────────── Tracing errors ───────────────────────────

const tracingOutputChannel = "Tracing";

const viewTracingOutputAction = {
  label: "View Tracing Output",
  execute: () => OutputChannel.show(),
};

registerNewErrorInRegistry({
  code: ErrorCode.TraceTclFailed,
  severity: ErrorSeverity.Error,
  userMessage: "App trace failed during {phase}: {detail}",
  logMessage: "App trace TCL failure during {phase}: {detail}",
  actions: [
    launchOpenOcdAction,
    viewTracingOutputAction,
  ],
  outputChannel: tracingOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.HeapTraceNotSupported,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Could not perform heap tracing. Enable heap tracing in your firmware configuration.",
  logMessage: "Heap trace functions not defined in firmware.",
  actions: [],
  outputChannel: tracingOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.TraceGdbProcessFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Heap trace GDB process failed: {detail}",
  logMessage: "Heap trace GDB process failed (exitCode: {exitCode}, detail: {detail}).",
  actions: [viewTracingOutputAction],
  outputChannel: tracingOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.TraceInvalidCommand,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Cannot call this command directly. Click on a trace in the archive to view its report.",
  logMessage: "Trace report command invoked without a trace argument.",
  actions: [],
  outputChannel: tracingOutputChannel,
});

// ──────────────────────────── Menuconfig errors ────────────────────────

const menuconfigOutputChannel = "SDK Configuration Editor";

registerNewErrorInRegistry({
  code: ErrorCode.ConfserverProcessFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "SDK Configuration editor process failed during {phase}.",
  logMessage:
    "Confserver process failed during {phase} (exitCode: {exitCode}, detail: {detail}).",
  actions: [
    {
      label: "View Output",
      execute: () => OutputChannel.show(),
    },
  ],
  outputChannel: menuconfigOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.ConfserverProtocolError,
  severity: ErrorSeverity.Error,
  userMessage:
    "SDK Configuration editor rejected a configuration update: {detail}.",
  logMessage: "Confserver protocol error: {detail}.",
  actions: [
    {
      label: "View Output",
      execute: () => OutputChannel.show(),
    },
  ],
  outputChannel: menuconfigOutputChannel,
});

// ──────────────────────────── QEMU errors ────────────────────────────

const qemuOutputChannel = "QEMU";

registerNewErrorInRegistry({
  code: ErrorCode.QemuTargetNotSupported,
  severity: ErrorSeverity.Error,
  userMessage:
    'IDF target "{target}" is not supported by Espressif QEMU. Check your ESP-IDF and QEMU installation.',
  logMessage: 'QEMU does not support IDF target "{target}".',
  actions: [
    {
      label: "Open ESP-IDF Install Manager",
      execute: () => commands.executeCommand("espIdf.installManager"),
    },
  ],
  outputChannel: qemuOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.QemuLaunchArgsMissing,
  severity: ErrorSeverity.Error,
  userMessage: "No QEMU launch arguments found.",
  logMessage: "QEMU launch arguments could not be resolved.",
  actions: [],
  outputChannel: qemuOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.QemuDebugLaunchFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to launch GDB debugger for QEMU: {detail}",
  logMessage: "QEMU debug session launch failed: {detail}.",
  actions: [],
  outputChannel: qemuOutputChannel,
});

// ──────────────────────────── Coverage errors ────────────────────────

const coverageOutputChannel = "Coverage";

registerNewErrorInRegistry({
  code: ErrorCode.CoverageGcovDataFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "Error building gcov data from gcda files. Check the ESP-IDF output for more details.",
  logMessage: "Failed to build gcov data from gcda files: {detail}.",
  actions: [
    {
      label: "Coverage Tutorial",
      execute: () =>
        env.openExternal(
          Uri.parse(
            "https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures/coverage.html"
          )
        ),
    },
    {
      label: "View Output",
      execute: () => OutputChannel.show(),
    },
  ],
  outputChannel: coverageOutputChannel,
});

// ──────────────────────────── Partition table errors ─────────────────

const partitionTableOutputChannel = "Partition Table";

registerNewErrorInRegistry({
  code: ErrorCode.PartitionSdkconfigRequired,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Partition table editor requires an sdkconfig file. Build the project first.",
  logMessage: "Partition table editor blocked: sdkconfig file is missing.",
  actions: [
    {
      label: "Build",
      execute: () => commands.executeCommand("espIdf.buildDevice"),
    },
  ],
  outputChannel: partitionTableOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.PartitionCustomTableNotEnabled,
  severity: ErrorSeverity.Warning,
  userMessage: "Custom partition table is not enabled for this project.",
  logMessage: "CONFIG_PARTITION_TABLE_CUSTOM is not enabled.",
  actions: [
    {
      label: "Open SDK Configuration",
      execute: () => commands.executeCommand("espIdf.menuconfig.start"),
    },
  ],
  outputChannel: partitionTableOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.PartitionTableFilenameEmpty,
  severity: ErrorSeverity.Error,
  userMessage:
    "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME is empty. Add a CSV file to generate the partition table.",
  logMessage: "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME is empty.",
  actions: [],
  outputChannel: partitionTableOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.PartitionPopulateFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "Failed to load partition table entries. Check the build output for details.",
  logMessage: "Partition table populate failed: {detail}.",
  actions: [
    {
      label: "Build",
      execute: () => commands.executeCommand("espIdf.buildDevice"),
    },
  ],
  outputChannel: partitionTableOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.PartitionInvalidSizeFormat,
  severity: ErrorSeverity.Error,
  userMessage: 'Partition size "{size}" is not a valid format (e.g. 24K, 1M).',
  logMessage: 'Invalid partition size format: "{size}".',
  actions: [],
  outputChannel: partitionTableOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.PartitionFlashFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to flash binary to partition: {detail}",
  logMessage: "Partition flash failed: {detail}.",
  actions: [],
  outputChannel: partitionTableOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.PartitionReadFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to read partition from device: {detail}",
  logMessage: "Partition read failed: {detail}.",
  actions: [],
  outputChannel: partitionTableOutputChannel,
});

// ──────────────────────────── Unit test errors ───────────────────────

const unitTestOutputChannel = "Unit Test";

registerNewErrorInRegistry({
  code: ErrorCode.UnitTestTaskFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "Unit test app task failed. Check the terminal output for details.",
  logMessage: "Unit test app task failed: {detail}.",
  actions: [
    {
      label: "View Terminal Output",
      execute: () => commands.executeCommand("workbench.action.terminal.focus"),
    },
  ],
  outputChannel: unitTestOutputChannel,
});

// ──────────────────────────── File errors ────────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.FILE_NOT_FOUND,
  severity: ErrorSeverity.Error,
  userMessage: "The file {filePath} could not be found.",
  logMessage: "File not found: {filePath}.",
  actions: [
    {
      label: "Open File…",
      execute: () =>
        commands.executeCommand("workbench.action.quickOpen"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.FILE_PERMISSION_DENIED,
  severity: ErrorSeverity.Error,
  userMessage: "Permission denied when accessing {filePath}.",
  logMessage: "File permission denied: {filePath}.",
  actions: [
    {
      label: "Retry as Admin",
      execute: async () => {
        // Platform-specific logic or guidance
        window.showInformationMessage(
          "Please re-open VS Code with elevated privileges."
        );
      },
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.FILE_TOO_LARGE,
  severity: ErrorSeverity.Warning,
  userMessage: "The file is too large to process.",
  logMessage: "File exceeded maximum size limit.",
  actions: [],
});

// ──────────────────────────── Workspace errors ───────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.NO_WORKSPACE_OPEN,
  severity: ErrorSeverity.Warning,
  userMessage: "Please open a workspace folder first.",
  logMessage: "Command requires an open workspace.",
  actions: [
    {
      label: "Open Folder…",
      execute: () => commands.executeCommand("vscode.openFolder"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.NO_ACTIVE_EDITOR,
  severity: ErrorSeverity.Info,
  userMessage: "No active text editor. Please open a file first.",
  logMessage: "Command requires an active text editor.",
  actions: [
    {
      label: "Open File…",
      execute: () =>
        commands.executeCommand("workbench.action.quickOpen"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.EnvironmentNotSupported,
  severity: ErrorSeverity.Warning,
  userMessage: "Selected command is not available in {envName}.",
  logMessage: "Command blocked: unsupported environment {envName}.",
  actions: [],
});

registerNewErrorInRegistry({
  code: ErrorCode.InvalidCommandInvocation,
  severity: ErrorSeverity.Warning,
  userMessage:
    "Cannot call this command directly. {detail}",
  logMessage: "Command invoked without required arguments: {detail}.",
  actions: [],
});

// ──────────────────────────── Config errors ──────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.EspIdfSettingsRemovalFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to remove ESP-IDF settings: {detail}",
  logMessage: "ESP-IDF settings removal failed: {detail}.",
  actions: [],
  outputChannel: "ESP-IDF",
});

registerNewErrorInRegistry({
  code: ErrorCode.INVALID_CONFIGURATION,
  severity: ErrorSeverity.Error,
  userMessage:
    "Extension setting {setting} is invalid. Please review your configuration.",
  logMessage: "Invalid extension configuration: {setting}.",
  actions: [
    {
      label: "Open Settings",
      execute: () =>
        commands.executeCommand(
          "workbench.action.openSettings",
          "espressif.esp-idf-extension"
        ),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.MISSING_DEPENDENCY,
  severity: ErrorSeverity.Error,
  userMessage: "Required dependency {dependency} is missing.",
  logMessage: "Missing dependency: {dependency}.",
  actions: [
    {
      label: "Open ESP-IDF Install Manager",
      execute: () => commands.executeCommand("espIdf.installManager"),
    },
  ],
});

registerNewErrorInRegistry({
  code: ErrorCode.PARSE_ERROR,
  severity: ErrorSeverity.Error,
  userMessage:
    "Failed to parse {filePath}. Please check the syntax.",
  logMessage: "Parse error in {filePath}.",
  actions: [],
});

// ──────────────────────────── New project errors ─────────────────────

const newProjectOutputChannel = "New Project";

registerNewErrorInRegistry({
  code: ErrorCode.NewProjectWizardFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to start the ESP-IDF New Project wizard.",
  logMessage: "New Project wizard failed: {detail}.",
  actions: [],
  outputChannel: newProjectOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.ProjectScaffoldFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to {operation}.",
  logMessage: "Project scaffold failed during {operation}: {detail}.",
  actions: [],
  outputChannel: newProjectOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.ImportProjectFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to import the ESP-IDF project.",
  logMessage: "Import project failed: {detail}.",
  actions: [],
  outputChannel: newProjectOutputChannel,
});

// ──────────────────────────── Rainmaker errors ─────────────────────

const rainmakerOutputChannel = "Rainmaker";

registerNewErrorInRegistry({
  code: ErrorCode.RainmakerLoginFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "Failed to login with Rainmaker Cloud, double check your id and password.",
  logMessage: "Rainmaker login failed: {detail}.",
  actions: [],
  outputChannel: rainmakerOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.RainmakerNodeDeleteFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "Failed to delete node, maybe the node is already marked for delete, please try again after sometime.",
  logMessage: "Rainmaker node delete failed: {detail}.",
  actions: [],
  outputChannel: rainmakerOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.RainmakerParamUpdateFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to update param because, {detail}",
  logMessage: "Rainmaker param update failed: {detail}.",
  actions: [],
  outputChannel: rainmakerOutputChannel,
});

// ──────────────────────────── eFuse errors ───────────────────────────

registerNewErrorInRegistry({
  code: ErrorCode.EfuseSummaryFailed,
  severity: ErrorSeverity.Error,
  userMessage:
    "Failed to get the eFuse summary from the chip. Make sure you have selected a valid port. {detail}",
  logMessage: "eFuse summary command failed: {detail}.",
  actions: [
    {
      label: "Select Port",
      execute: () => commands.executeCommand("espIdf.selectPort"),
    },
  ],
  outputChannel: "eFuse",
});

// ──────────────────────────── EIM errors ─────────────────────────────

const eimOutputChannel = "EIM";

const openEimReleasesAction = {
  label: "Open Releases URL",
  execute: () => env.openExternal(Uri.parse(ESP.URL.InstallManager.Releases)),
};

registerNewErrorInRegistry({
  code: ErrorCode.EimDownloadCanceled,
  severity: ErrorSeverity.Info,
  userMessage: "EIM download was canceled.",
  logMessage: "EIM download canceled by user.",
  actions: [],
  outputChannel: eimOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.EimDownloadFailed,
  severity: ErrorSeverity.Error,
  userMessage: "EIM download or installation failed: {detail}",
  logMessage: "EIM download/install failed: {detail}.",
  actions: [openEimReleasesAction],
  outputChannel: eimOutputChannel,
});

registerNewErrorInRegistry({
  code: ErrorCode.EimAssetNotFound,
  severity: ErrorSeverity.Error,
  userMessage:
    "No EIM release asset found for this platform: {assetName}.",
  logMessage: "EIM asset not found in release manifest: {assetName}.",
  actions: [openEimReleasesAction],
  outputChannel: eimOutputChannel,
});

// ──────────────────────────── Repository cloning errors ──────────────

registerNewErrorInRegistry({
  code: ErrorCode.RepositoryCloneFailed,
  severity: ErrorSeverity.Error,
  userMessage: "Failed to clone {repoName}. {detail}",
  logMessage: "Repository clone failed for {repoName}: {detail}.",
  actions: [
    {
      label: "View Output",
      execute: () => OutputChannel.show(),
    },
  ],
});

// ──────────────────────────── Public API ─────────────────────────────

export function getErrorDescriptor(
  code: ErrorCode
): KnownErrorDescriptor | undefined {
  return errorRegistry.get(code);
}

export function getAllErrorDescriptors(): ReadonlyMap<
  ErrorCode,
  KnownErrorDescriptor
> {
  return errorRegistry;
}
