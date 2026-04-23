/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 5th December 2025 1:14:59 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { Uri } from "vscode";
import { OutputChannel } from "../../../logger/outputChannel";
import { OpenOCDManager } from "../../../espIdf/openOcd/openOcdManager";
import { readParameter } from "../../../idfConfiguration";
import { Logger } from "../../../logger/logger";
import { TCLClient } from "../../../espIdf/openOcd/tcl/tclClient";
import { assertMinimumOpenOcdVersionForJtag } from "../../../flash/transports/jtag/assertMinimumOpenOcdVersionForJtag";
import { eraseFlashTelnetCommand } from "./tclClientCmd";
import {
  collectExecutions,
  throwCapturedTaskFailure,
} from "../../../taskManager";
import { CustomExecutionTaskResult } from "../../../taskManager/customExecution";

export async function jtagEraseFlashCommand(
  workspaceFolder: Uri
): Promise<CustomExecutionTaskResult> {
  if (!(await assertMinimumOpenOcdVersionForJtag())) {
    return { continueFlag: false, executions: [] };
  }
  const openOCDManager = OpenOCDManager.init();
  const isOpenOCDLaunched = await openOCDManager.promptUserToLaunchOpenOCDServer();
  if (!isOpenOCDLaunched) {
    const errStr =
      "Can't perform Erase JTAG, because OpenOCD server is not running!";
    OutputChannel.appendLineAndShow(errStr, "Erase Flash");
    Logger.warnNotify(errStr);
    return { continueFlag: false, executions: [] };
  }
  const host = readParameter("openocd.tcl.host", workspaceFolder);
  const port = readParameter("openocd.tcl.port", workspaceFolder);
  const client = new TCLClient({ host, port });

  let isReady = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    isReady = await client.verifyOpenOCDReady();
    if (isReady) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!isReady) {
    const errStr = "OpenOCD is not ready to accept commands. Please try again.";
    OutputChannel.appendLineAndShow(errStr, "Erase Flash");
    Logger.warnNotify(errStr);
    return { continueFlag: false, executions: [] };
  }

  const eraseResult = await eraseFlashTelnetCommand(
    client,
    "halt; flash erase_sector 0 0 last; reset"
  );
  if (!eraseResult.continueFlag) {
    await throwCapturedTaskFailure(eraseResult.executions);
  }
  return {
    continueFlag: true,
    executions: collectExecutions(...eraseResult.executions),
  };
}
