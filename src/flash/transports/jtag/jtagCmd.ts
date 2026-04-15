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

import { FlashSession } from "../../shared/flashSession";
import { JTAGFlash } from "./flashTclClient";
import { TCLClient } from "../../../espIdf/openOcd/tcl/tclClient";
import { readParameter } from "../../../idfConfiguration";
import { OpenOCDManager } from "../../../espIdf/openOcd/openOcdManager";
import { Logger } from "../../../logger/logger";
import {
  CustomTask,
  CustomTaskType,
} from "../../../customTasks/customTaskProvider";
import { Uri } from "vscode";
import { OutputChannel } from "../../../logger/outputChannel";
import {
  collectExecutions,
  TaskManager,
  throwCapturedTaskFailure,
} from "../../../taskManager";

export async function jtagFlashCommandMain(workspace: Uri) {
  const isOpenOCDLaunched = await OpenOCDManager.init().promptUserToLaunchOpenOCDServer();
  if (!isOpenOCDLaunched) {
    const errStr =
      "Can't perform JTAG flash, because OpenOCD server is not running!";
    OutputChannel.appendLineAndShow(errStr, "Flash");
    Logger.warnNotify(errStr);
    return { continueFlag: false, executions: [] };
  }
  const host = readParameter("openocd.tcl.host", workspace);
  const port = readParameter("openocd.tcl.port", workspace);
  const client = new TCLClient({ host, port });

  // Add verification step before flashing
  let isReady = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    isReady = await client.verifyOpenOCDReady();
    if (isReady) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!isReady) {
    const errStr = "OpenOCD is not ready to accept commands. Please try again.";
    OutputChannel.appendLineAndShow(errStr, "JTAG Flash");
    Logger.warnNotify(errStr);
    return { continueFlag: false, executions: [] };
  }

  FlashSession.isFlashing = true;
  const jtag = new JTAGFlash(client);
  const forceUNIXPathSeparator = readParameter(
    "openocd.jtag.command.force_unix_path_separator",
    workspace
  );
  let buildPath = readParameter("idf.buildPath", workspace) as string;
  let openOCDJTagFlashArguments = readParameter(
    "idf.jtagFlashCommandExtraArgs",
    workspace
  ) as string[];
  const customTask = new CustomTask(workspace);
  if (forceUNIXPathSeparator === true) {
    buildPath = buildPath.replace(/\\/g, "/");
  }
  const preFlashExecution = await customTask.addCustomTask(
    CustomTaskType.PreFlash
  );
  await TaskManager.runTasks();
  await jtag.flash(
    "program_esp_bins",
    buildPath,
    "flasher_args.json",
    ...openOCDJTagFlashArguments
  );
  const postFlashExecution = await customTask.addCustomTask(
    CustomTaskType.PostFlash
  );
  await TaskManager.runTasks();
  const msg = "⚡️ Flashed Successfully (JTAG)";
  OutputChannel.appendLineAndShow(msg, "Flash");
  Logger.infoNotify(msg);
  return {
    continueFlag: true,
    executions: collectExecutions(preFlashExecution, postFlashExecution),
  };
}

export async function jtagFlashCommand(workspace: Uri) {
  let continueFlag = true;
  try {
    const flashCmdResult = await jtagFlashCommandMain(workspace);
    continueFlag = flashCmdResult.continueFlag;
    if (!continueFlag) {
      await throwCapturedTaskFailure(flashCmdResult.executions);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const msg = "JTAG Flash Failed ⚡️";
    OpenOCDManager.init().showOutputChannel(true);
    OutputChannel.appendLine(errorMsg, "Flash");
    Logger.errorNotify(msg, err as Error, "jtagFlashCommand");
    continueFlag = false;
  }
  FlashSession.isFlashing = false;
  return continueFlag;
}
