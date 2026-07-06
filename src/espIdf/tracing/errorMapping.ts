/*
 * Project: ESP-IDF VSCode Extension
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

import { commands } from "vscode";
import { ErrorSeverity } from "../../common/customNotifications";
import { CommandErrorMapping, ErrorCode } from "../../common/error/types";
import { OutputChannel } from "../../common/outputChannel";

const tracingOutputChannel = "Tracing";

export const sharedTracingOpenOcdOverrides: CommandErrorMapping = {
  [ErrorCode.OpenOcdLaunchDeclined]: {
    severity: ErrorSeverity.Info,
    userMessage: "OpenOCD was not launched. App trace requires a running OpenOCD server.",
    logMessage: "Tracing cancelled: user declined to launch OpenOCD.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.OpenOcdNotRunning]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Can't perform tracing, because OpenOCD server is not running!",
    logMessage: "OpenOCD server is not running after launch attempt.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.OpenOcdNotReady]: {
    severity: ErrorSeverity.Warning,
    userMessage: "OpenOCD is not ready to accept commands. Please try again.",
    logMessage: "OpenOCD TCL server did not become ready within retry limit.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
};

export const appTraceCommandErrorMapping: CommandErrorMapping = {
  ...sharedTracingOpenOcdOverrides,
  [ErrorCode.TraceTclFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "App trace failed during {phase}: {detail}",
    logMessage: "App trace TCL failure during {phase}: {detail}",
    actions: [
      {
        label: "View Tracing Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
};

export const heapTraceCommandErrorMapping: CommandErrorMapping = {
  ...sharedTracingOpenOcdOverrides,
  [ErrorCode.OpenOcdLaunchDeclined]: {
    severity: ErrorSeverity.Info,
    userMessage: "OpenOCD was not launched. Heap trace requires a running OpenOCD server.",
    logMessage: "Heap tracing cancelled: user declined to launch OpenOCD.",
    actions: [
      {
        label: "Launch OpenOCD",
        execute: () => commands.executeCommand("espIdf.openOCDCommand"),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.BuildRequiredBeforeFlash]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Build is required before heap tracing. {buildDirPath} can't be accessed.",
    logMessage: "Heap trace blocked: build directory not accessible: {buildDirPath}.",
    actions: [
      {
        label: "Build",
        execute: () => commands.executeCommand("espIdf.buildDevice"),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.IdfToolNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "{toolName} was not found. Please install {toolName} and ensure it's in your PATH.",
    logMessage: "{toolName} executable not found.",
    actions: [],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage: "The file {filePath} could not be found.",
    logMessage: "File not found: {filePath}.",
    actions: [],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.HeapTraceNotSupported]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Could not perform heap tracing. Enable heap tracing in your firmware configuration.",
    logMessage: "Heap trace functions not defined in firmware.",
    actions: [],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.TraceGdbProcessFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Heap trace GDB process failed: {detail}",
    logMessage:
      "Heap trace GDB process failed (exitCode: {exitCode}, detail: {detail}).",
    actions: [
      {
        label: "View Tracing Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
};

export const traceArchiveCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.TraceInvalidCommand]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Cannot call this command directly. Click on a trace in the archive to view its report.",
    logMessage: "Trace report command invoked without a trace argument.",
    actions: [],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to open trace file at {filePath}.",
    logMessage: "Trace file not found: {filePath}.",
    actions: [],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.PARSE_ERROR]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Failed to parse trace file at {filePath}. Make sure sysviewtrace_proc.py supports JSON output (-j flag).",
    logMessage: "Trace file parse error: {filePath}.",
    actions: [
      {
        label: "View Tracing Output",
        execute: () => OutputChannel.show(),
      },
    ],
    outputChannel: tracingOutputChannel,
  },
  [ErrorCode.IdfToolNotFound]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "{toolName} was not found. Please install {toolName} and ensure it's accessible.",
    logMessage: "{toolName} executable not found.",
    actions: [],
    outputChannel: tracingOutputChannel,
  },
};
