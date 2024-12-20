/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 7th May 2021 3:58:36 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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
import { join } from "path";
import { commands, l10n, Uri } from "vscode";
import { FlashTask } from "../../flash/flashTask";
import { readParameter } from "../../idfConfiguration";
import * as utils from "../../utils";
import { BuildTask } from "../../build/buildTask";
import { Logger } from "../../logger/logger";
import { R_OK } from "constants";
import { IDFMonitor, MonitorConfig } from ".";
import { ESP } from "../../config";
import {
  getIdfTargetFromSdkconfig,
  getProjectName,
} from "../../workspaceConfig";
import { getVirtualEnvPythonPath } from "../../pythonManager";

export async function createNewIdfMonitor(
  workspaceFolder: Uri,
  noReset: boolean = false,
  serialPort?: string
) {
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = l10n.t("Wait for ESP-IDF task to finish");
    Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time"),
      "createNewIdfMonitor wait for building flashing task to finish"
    );
    return;
  }
  const port = serialPort
    ? serialPort
    : (readParameter("idf.port", workspaceFolder) as string);
  if (!port) {
    try {
      await commands.executeCommand("espIdf.selectPort");
    } catch (error) {
      Logger.error(
        "Unable to execute the command: espIdf.selectPort",
        error,
        "command createNewIdfMonitor"
      );
    }
    Logger.errorNotify(
      "Select a serial port before flashing",
      new Error("NOT_SELECTED_PORT"),
      "createNewIdfMonitor select a serial port"
    );
  }
  const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
  if (!utils.canAccessFile(pythonBinPath, R_OK)) {
    Logger.errorNotify(
      "Python binary path is not defined",
      new Error("Virtual environment Python path is not defined"),
      "createNewIdfMonitor pythonBinPath not defined"
    );
  }
  const customExtraVars = readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const idfPath = customExtraVars["IDF_PATH"];
  const idfVersion = await utils.getEspIdfFromCMake(idfPath);
  let sdkMonitorBaudRate: string = await utils.getMonitorBaudRate(
    workspaceFolder
  );
  const idfMonitorToolPath = join(idfPath, "tools", "idf_monitor.py");
  if (!utils.canAccessFile(idfMonitorToolPath, R_OK)) {
    Logger.errorNotify(
      idfMonitorToolPath + " is not defined",
      new Error(idfMonitorToolPath + " is not defined"),
      "createNewIdfMonitor idf_monitor not found"
    );
  }
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder
  ) as string;
  let idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder);
  const projectName = await getProjectName(buildDirPath);
  const elfFilePath = join(buildDirPath, `${projectName}.elf`);
  const toolchainPrefix = utils.getToolchainToolName(idfTarget, "");
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
  const idfMonitorConfig: MonitorConfig = {
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
  };
  IDFMonitor.updateConfiguration(idfMonitorConfig);
  if (IDFMonitor.terminal) {
    IDFMonitor.terminal.sendText(ESP.CTRL_RBRACKET);
  }
  IDFMonitor.start();
  if (noReset) {
    if (idfVersion <= "5.0") {
      const monitorDelay = readParameter(
        "idf.monitorStartDelayBeforeDebug",
        workspaceFolder
      ) as number;
      await utils.sleep(monitorDelay);
    }
  }
}
