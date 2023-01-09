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
import { commands, Uri } from "vscode";
import { FlashTask } from "../../flash/flashTask";
import { readParameter } from "../../idfConfiguration";
import * as utils from "../../utils";
import { BuildTask } from "../../build/buildTask";
import { LocDictionary } from "../../localizationDictionary";
import { Logger } from "../../logger/logger";
import { R_OK } from "constants";
import { getProjectName } from "../../workspaceConfig";
import { IDFMonitor } from ".";

const locDic = new LocDictionary(__filename);

export async function createNewIdfMonitor(
  workspaceFolder: Uri,
  serialPort?: string
) {
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = locDic.localize(
      "monitor.waitProcessIsFinishedMessage",
      "Wait for ESP-IDF task to finish"
    );
    Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time")
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
      Logger.error("Unable to execute the command: espIdf.selectPort", error);
    }
    Logger.errorNotify(
      "Select a serial port before flashing",
      new Error("NOT_SELECTED_PORT")
    );
  }
  let sdkMonitorBaudRate: string = utils.getMonitorBaudRate(
    workspaceFolder
  );
  const pythonBinPath = readParameter(
    "idf.pythonBinPath",
    workspaceFolder
  ) as string;
  if (!utils.canAccessFile(pythonBinPath, R_OK)) {
    Logger.errorNotify(
      "Python binary path is not defined",
      new Error("idf.pythonBinPath is not defined")
    );
  }
  const idfPath = readParameter("idf.espIdfPath", workspaceFolder) as string;
  const idfVersion = await utils.getEspIdfFromCMake(idfPath);
  const idfMonitorToolPath = join(idfPath, "tools", "idf_monitor.py");
  if (!utils.canAccessFile(idfMonitorToolPath, R_OK)) {
    Logger.errorNotify(
      idfMonitorToolPath + " is not defined",
      new Error(idfMonitorToolPath + " is not defined")
    );
  }
  const buildDirPath = readParameter(
    "idf.buildPath",
    workspaceFolder
  ) as string;
  let idfTarget = readParameter("idf.adapterTargetName", workspaceFolder);
  if (idfTarget === "custom") {
    idfTarget = readParameter("idf.customAdapterTargetName", workspaceFolder);
  }
  const projectName = await getProjectName(buildDirPath);
  const elfFilePath = join(buildDirPath, `${projectName}.elf`);
  const toolchainPrefix = utils.getToolchainToolName(idfTarget, "");
  const monitor = new IDFMonitor({
    port,
    baudRate: sdkMonitorBaudRate,
    pythonBinPath,
    idfTarget,
    idfMonitorToolPath,
    idfVersion,
    elfFilePath,
    workspaceFolder,
    toolchainPrefix,
  });
  return monitor;
}
