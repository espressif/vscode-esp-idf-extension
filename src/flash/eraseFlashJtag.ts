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
import { OutputChannel } from "../logger/outputChannel";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { readParameter } from "../idfConfiguration";
import { Logger } from "../logger/logger";
import { TCLClient } from "../espIdf/openOcd/tcl/tclClient";
import { PreCheck } from "../utils";

export async function jtagEraseFlashCommand(workspaceFolder: Uri) {
  const openOCDManager = OpenOCDManager.init();
  const currOpenOcdVersion = await openOCDManager.version();
  const openOCDVersionIsValid = PreCheck.openOCDVersionValidator(
    "v0.10.0-esp32-20201125",
    currOpenOcdVersion
  );
  if (!openOCDVersionIsValid) {
    Logger.infoNotify(
      `Minimum OpenOCD version v0.10.0-esp32-20201125 is required while you have ${currOpenOcdVersion} version installed`
    );
    return;
  }
  const isOpenOCDLaunched = await openOCDManager.promptUserToLaunchOpenOCDServer();
  if (!isOpenOCDLaunched) {
    const errStr =
      "Can't perform JTAG flash, because OpenOCD server is not running!";
    OutputChannel.appendLineAndShow(errStr, "Flash");
    Logger.warnNotify(errStr);
    return false;
  }
  const host = readParameter("openocd.tcl.host", workspaceFolder);
  const port = readParameter("openocd.tcl.port", workspaceFolder);
  const client = new TCLClient({ host, port });
  await eraseFlashTelnetCommand(
    client,
    "halt; flash erase_sector 0 0 last; reset"
  );
}

export async function eraseFlashTelnetCommand(
  client: TCLClient,
  command: string,
  ...args: string[]
) {
  const fullCommand = `${command} ${args.map((arg) => `"${arg}"`).join(" ")}`;

  return new Promise((resolve, reject) => {
    client
      .on("response", (data: Buffer) => {
        const response = data
          .toString()
          .replace(TCLClient.DELIMITER, "")
          .trim();
        if (response === "" && args.some((arg) => arg.includes("exit"))) {
          resolve(response);
        }
        if (response.indexOf("erased sectors ") === -1) {
          return reject(
            `Failed to erase flash from the device (JTAG), please try again [got response: '${response}', expecting: 'erased sectors ']`
          );
        }

        //Flash successful when response includes erased sectors ...
        resolve(response);
      })
      .on("error", (err) => {
        reject(
          "Failed to erase flash (via JTAG), due to some unknown error in tcl, please try to relaunch open-ocd"
        );
      })
      .sendCommand(fullCommand);
  });
}
