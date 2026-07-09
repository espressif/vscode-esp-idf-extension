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

export const partitionTableOutputChannel = "Partition Table";

const buildProjectAction = {
  label: "Build",
  execute: () => commands.executeCommand("espIdf.buildDevice"),
};

const selectPortAction = {
  label: "Select Port",
  execute: () => commands.executeCommand("espIdf.selectPort"),
};

export const partitionTableCommandErrorMapping: CommandErrorMapping = {
  [ErrorCode.PartitionSdkconfigRequired]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Partition table editor requires an sdkconfig file. Build the project first.",
    logMessage: "Partition table editor blocked: sdkconfig file is missing.",
    actions: [buildProjectAction],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.PartitionCustomTableNotEnabled]: {
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
  },
  [ErrorCode.PartitionTableFilenameEmpty]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME is empty. Add a CSV file to generate the partition table.",
    logMessage: "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME is empty.",
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.PartitionPopulateFailed]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Failed to load partition table entries. Check the build output for details.",
    logMessage: "Partition table populate failed: {detail}.",
    actions: [buildProjectAction],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.PartitionInvalidSizeFormat]: {
    severity: ErrorSeverity.Error,
    userMessage: 'Partition size "{size}" is not a valid format (e.g. 24K, 1M).',
    logMessage: 'Invalid partition size format: "{size}".',
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.PartitionFlashFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to flash binary to partition: {detail}",
    logMessage: "Partition flash failed: {detail}.",
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.PartitionReadFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to read partition from device: {detail}",
    logMessage: "Partition read failed: {detail}.",
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.NoSerialPort]: {
    severity: ErrorSeverity.Warning,
    userMessage: "No serial port found for current IDF_TARGET: {idfTarget}",
    logMessage: "No serial port found for IDF_TARGET {idfTarget}.",
    actions: [selectPortAction],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.MISSING_DEPENDENCY]: {
    severity: ErrorSeverity.Error,
    userMessage: "Required dependency {dependency} is missing.",
    logMessage: "Missing dependency: {dependency}.",
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.FILE_NOT_FOUND]: {
    severity: ErrorSeverity.Error,
    userMessage: "The file {filePath} could not be found.",
    logMessage: "File not found: {filePath}.",
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.NO_WORKSPACE_OPEN]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Please open a workspace folder first.",
    logMessage: "Partition table command requires an open workspace.",
    actions: [
      {
        label: "Open Folder…",
        execute: () => commands.executeCommand("vscode.openFolder"),
      },
    ],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.FlasherArgsMissing]: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "flasher_args.json file is missing from the build directory. Build the project first.",
    logMessage: "flasher_args.json missing from build directory.",
    actions: [buildProjectAction],
    outputChannel: partitionTableOutputChannel,
  },
  [ErrorCode.InvalidCommandInvocation]: {
    severity: ErrorSeverity.Warning,
    userMessage: "Cannot call this command directly. {detail}",
    logMessage: "Partition table command invoked without required arguments: {detail}.",
    actions: [],
    outputChannel: partitionTableOutputChannel,
  },
};
