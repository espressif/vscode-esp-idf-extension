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

import { FlashTask } from "./flashTask";
import { JTAGFlash } from "./jtag";
import { TCLClient } from "../espIdf/openOcd/tcl/tclClient";
import { readParameter } from "../idfConfiguration";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { Logger } from "../logger/logger";
import { CustomTask, CustomTaskType } from "../customTasks/customTaskProvider";
import { Uri } from "vscode";
import { OutputChannel } from "../logger/outputChannel";

export async function jtagFlashCommand(workspace: Uri) {
  let continueFlag = true;
  const isOpenOCDLaunched = await OpenOCDManager.init().promptUserToLaunchOpenOCDServer();
  if (!isOpenOCDLaunched) {
    const errStr =
      "Can't perform JTag flash, because OpenOCD server is not running!";
    OutputChannel.appendLineAndShow(errStr, "Flash");
    return Logger.warnNotify(errStr);
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
    return Logger.warnNotify(errStr);
  }

  FlashTask.isFlashing = true;
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
  try {
    await customTask.addCustomTask(CustomTaskType.PreFlash);
    await customTask.runTasks(CustomTaskType.PreFlash);
    await jtag.flash(
      "program_esp_bins",
      buildPath,
      "flasher_args.json",
      ...openOCDJTagFlashArguments
    );
    await customTask.addCustomTask(CustomTaskType.PostFlash);
    await customTask.runTasks(CustomTaskType.PostFlash);
    const msg = "⚡️ Flashed Successfully (JTag)";
    OutputChannel.appendLineAndShow(msg, "Flash");
    Logger.infoNotify(msg);
  } catch (msg) {
    OpenOCDManager.init().showOutputChannel(true);
    OutputChannel.appendLine(msg, "Flash");
    Logger.errorNotify(msg, new Error("JTAG_FLASH_FAILED"), "jtagFlashCommand");
    continueFlag = false;
  }
  FlashTask.isFlashing = false;
  return continueFlag;
}
