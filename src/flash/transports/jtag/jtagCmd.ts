/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 6th May 2021 2:29:08 pm
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

import { connectOpenOcdForJtag } from "../../../espIdf/openOcd/jtagPreflight";
import { TCLClient } from "../../../espIdf/openOcd/tcl/tclClient";
import { readParameter } from "../../../configuration/idf";
import { Logger } from "../../../common/logger";
import {
  CustomTask,
  CustomTaskType,
} from "../../../taskManager/customTaskProvider";
import { CancellationToken, Disposable, Uri } from "vscode";
import { OutputChannel } from "../../../common/outputChannel";
import { TaskManager } from "../../../taskManager/taskManager";
import { jtagFlash } from "./flashTclClient";
import type { CustomExecutionTaskResult } from "../../../taskManager/types";
import { throwFlashCapturedTaskFailure } from "../../shared/flashTaskFailure";
import { flashJtagOpenOcdPresentation } from "../../jtagOpenOcdPresentation";

export async function jtagFlashCommandMain(
  cancelToken: CancellationToken,
  workspace: Uri,
  buildDirPath: string
): Promise<CustomExecutionTaskResult> {
  let client: TCLClient | undefined;
  let cancelSubscription: Disposable | undefined;
  try {
    client = await connectOpenOcdForJtag(workspace, flashJtagOpenOcdPresentation);
    cancelSubscription = cancelToken.onCancellationRequested(() => {
      client?.stop();
    });

    const forceUNIXPathSeparator = readParameter(
      "openocd.jtag.command.force_unix_path_separator",
      workspace
    );
    const rawJtagFlashExtraArgs = readParameter(
      "idf.jtagFlashCommandExtraArgs",
      workspace
    );
    const openOCDJTagFlashArguments = Array.isArray(rawJtagFlashExtraArgs)
      ? (rawJtagFlashExtraArgs as string[])
      : [];
    const customTask = new CustomTask(workspace);
    if (forceUNIXPathSeparator === true) {
      buildDirPath = buildDirPath.replace(/\\/g, "/");
    }
    await customTask.addCustomTask(CustomTaskType.PreFlash);
    await TaskManager.runTasks();
    const flashExecution = await jtagFlash(
      client,
      "program_esp_bins",
      buildDirPath,
      "flasher_args.json",
      ...openOCDJTagFlashArguments
    );
    if (!flashExecution.continueFlag) {
      await throwFlashCapturedTaskFailure();
      return { continueFlag: false };
    }
    await customTask.addCustomTask(CustomTaskType.PostFlash);
    await TaskManager.runTasks();
    const msg = "⚡️ Flashed Successfully (JTAG)";
    OutputChannel.appendLineAndShow(msg, "Flash");
    Logger.infoNotify(msg);
    return { continueFlag: true };
  } finally {
    cancelSubscription?.dispose();
    client?.stop();
  }
}
