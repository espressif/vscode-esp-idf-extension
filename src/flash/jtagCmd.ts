/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 6th May 2021 2:29:08 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
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
import { TaskManager } from "../taskManager";
import { Uri } from "vscode";
import { join } from "path";

export async function jtagFlashCommand(workspace: Uri) {
  let continueFlag = true;
  const isOpenOCDLaunched = await OpenOCDManager.init().promptUserToLaunchOpenOCDServer();
  if (!isOpenOCDLaunched) {
    return Logger.warnNotify(
      "Can't perform JTag flash, because OpenOCD server is not running!!"
    );
  }
  FlashTask.isFlashing = true;
  const host = readParameter("openocd.tcl.host", workspace);
  const port = readParameter("openocd.tcl.port", workspace);
  const client = new TCLClient({ host, port });
  const jtag = new JTAGFlash(client);
  const forceUNIXPathSeparator = readParameter(
    "openocd.jtag.command.force_unix_path_separator",
    workspace
  );
  let buildPath = readParameter(
    "idf.buildDirectoryName",
    workspace
  ) as string;
  const customTask = new CustomTask(Uri.file(buildPath));
  if (forceUNIXPathSeparator === true) {
    buildPath = buildPath.replace(/\\/g, "/");
  }
  try {
    customTask.addCustomTask(CustomTaskType.PreFlash);
    await customTask.runTasks(CustomTaskType.PreFlash);
    await jtag.flash(
      `program_esp_bins ${buildPath} flasher_args.json verify reset`
    );
    customTask.addCustomTask(CustomTaskType.PostFlash);
    await customTask.runTasks(CustomTaskType.PostFlash);
    Logger.infoNotify("⚡️ Flashed Successfully (JTag)");
  } catch (msg) {
    OpenOCDManager.init().showOutputChannel(true);
    Logger.errorNotify(msg, new Error("JTAG_FLASH_FAILED"));
    continueFlag = false;
  }
  FlashTask.isFlashing = false;
  return continueFlag;
}
