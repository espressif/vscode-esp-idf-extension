/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 30th April 2021 9:26:11 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { pathExists } from "fs-extra";
import { BuildTask } from "./buildTask";
import { FlashTask } from "../flash/flashTask";
import * as vscode from "vscode";
import { Logger } from "../logger/logger";
import { TaskManager } from "../taskManager";
import { join } from "path";
import {
  getIdfTargetFromSdkconfig,
  updateIdfComponentsTree,
} from "../workspaceConfig";
import { IdfSizeTask } from "../espIdf/size/idfSizeTask";
import { CustomTask, CustomTaskType } from "../customTasks/customTaskProvider";
import { readParameter, readSerialPort } from "../idfConfiguration";
import { ESP } from "../config";
import { createFlashModel } from "../flash/flashModelBuilder";
import { OutputChannel } from "../logger/outputChannel";

export async function buildCommand(
  workspace: vscode.Uri,
  cancelToken: vscode.CancellationToken,
  flashType: ESP.FlashType,
  buildType?: ESP.BuildType
) {
  let continueFlag = true;
  const buildTask = new BuildTask(workspace);
  const customTask = new CustomTask(workspace);
  if (BuildTask.isBuilding || FlashTask.isFlashing) {
    const waitProcessIsFinishedMsg = vscode.l10n.t(
      "Wait for ESP-IDF build or flash to finish"
    );
    Logger.errorNotify(
      waitProcessIsFinishedMsg,
      new Error("One_Task_At_A_Time"),
      "buildCmd buildCommand"
    );
    return;
  }
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
    TaskManager.disposeListeners();
    buildTask.building(false);
  });
  try {
    await customTask.addCustomTask(CustomTaskType.PreBuild);
    await buildTask.build(buildType);
    await TaskManager.runTasks();
    const enableSizeTask = (await readParameter(
      "idf.enableSizeTaskAfterBuildTask",
      workspace
    )) as boolean;
    if (enableSizeTask && typeof buildType === "undefined") {
      const sizeTask = new IdfSizeTask(workspace);
      await sizeTask.getSizeInfo();
    }
    await customTask.addCustomTask(CustomTaskType.PostBuild);
    await TaskManager.runTasks();
    if (flashType === ESP.FlashType.DFU) {
      const buildPath = readParameter("idf.buildPath", workspace) as string;
      if (!(await pathExists(join(buildPath, "flasher_args.json")))) {
        return Logger.warnNotify(
          "flasher_args.json file is missing from the build directory, can't proceed, please build properly!"
        );
      }
      const adapterTargetName = await getIdfTargetFromSdkconfig(workspace);
      if (
        adapterTargetName &&
        adapterTargetName !== "esp32s2" &&
        adapterTargetName !== "esp32s3"
      ) {
        return Logger.warnNotify(
          `The selected device target "${adapterTargetName}" is not compatible for DFU, as a result the DFU.bin was not created.`
        );
      } else {
        await buildTask.buildDfu();
        await TaskManager.runTasks();
      }
    }
    if (!cancelToken.isCancellationRequested) {
      updateIdfComponentsTree(workspace);
      Logger.infoNotify("Build Successful");
      const flashCmd = await buildFinishFlashCmd(workspace);
      OutputChannel.appendLine(flashCmd, "Build");
      TaskManager.disposeListeners();
    }
  } catch (error) {
    if (error.message === "ALREADY_BUILDING") {
      return Logger.errorNotify(
        "Already a build is running!",
        error,
        "buildCommand"
      );
    }
    if (error.message === "BUILD_TERMINATED") {
      return Logger.warnNotify(`Build is Terminated`);
    }
    Logger.errorNotify(
      "Something went wrong while trying to build the project",
      error,
      "buildCommand",
      undefined,
      false
    );
    continueFlag = false;
  }
  buildTask.building(false);
  return continueFlag;
}

export async function buildFinishFlashCmd(workspace: vscode.Uri) {
  const buildPath = readParameter("idf.buildPath", workspace) as string;
  const flasherArgsPath = join(buildPath, "flasher_args.json");
  const flasherArgsExists = await pathExists(flasherArgsPath);
  if (!flasherArgsExists) {
    return;
  }
  const port = await readSerialPort(workspace, false);
  const flashBaudRate = readParameter("idf.flashBaudRate", workspace);

  const flasherArgsModel = await createFlashModel(
    flasherArgsPath,
    port,
    flashBaudRate
  );

  let flashFiles = `--flash_mode ${flasherArgsModel.mode}`;
  flashFiles += ` --flash_size ${flasherArgsModel.size}`;
  flashFiles += ` --flash_freq ${flasherArgsModel.frequency} `;
  for (const flashFile of flasherArgsModel.flashSections) {
    flashFiles += `${flashFile.address} ${flashFile.binFilePath} `;
  }

  let flashString = "Project build complete. To flash, run:\n";
  flashString +=
    "ESP-IDF: Flash your project in the ESP-IDF Visual Studio Code Extension\n";
  flashString += "or in a ESP-IDF Terminal:\n";
  flashString += "idf.py flash\n";
  flashString += "or\r\nidf.py -p PORT flash\n";
  flashString += "or\r\n";
  flashString += `python -m esptool --chip ${
    flasherArgsModel.chip
  } -b ${flashBaudRate} --before ${flasherArgsModel.before} --after ${
    flasherArgsModel.after
  } ${flasherArgsModel.stub === false ? "--no-stub" : ""} ${
    port ? `--port ${port}` : ""
  } write_flash ${flashFiles}\n`;
  flashString += `or from the "${buildPath}" directory\n`;
  flashString += `python -m esptool --chip ${flasherArgsModel.chip} `;
  flashString += `-b ${flashBaudRate} --before ${flasherArgsModel.before} `;
  flashString += `--after ${flasherArgsModel.after} write_flash "@flash_args"`;
  return flashString;
}
