/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 16th April 2026 5:29:45 pm
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

import { TCLClient } from "../../../espIdf/openOcd/tcl/tclClient";
import { createCapturedExecution } from "../../../flash/transports/jtag/flashTclClient";
import {
  CapturedTaskOutput,
  CustomExecutionTaskResult,
} from "../../../taskManager/customExecution";

function eraseSuccess(response: string): boolean {
  if (response === "") {
    return true;
  }
  return response.indexOf("erased sectors ") !== -1;
}

export async function eraseFlashTelnetCommand(
  client: TCLClient,
  command: string,
  ...args: string[]
): Promise<CustomExecutionTaskResult> {
  const fullCommand = `${command} ${args.map((arg) => `"${arg}"`).join(" ")}`;

  return new Promise<CustomExecutionTaskResult>((resolve) => {
    client
      .on("response", (data: Buffer) => {
        const response = data
          .toString()
          .replace(TCLClient.DELIMITER, "")
          .trim();
        const success = eraseSuccess(response);
        const stderr = success
          ? ""
          : `Failed to erase flash from the device (JTAG), please try again [got response: '${response}', expecting: 'erased sectors ']`;
        const output: CapturedTaskOutput = {
          stdout: response,
          stderr,
          success,
          exitCode: success ? 0 : -1,
        };
        resolve({
          continueFlag: success,
          executions: [createCapturedExecution(output)],
        });
      })
      .on("error", (err: unknown) => {
        const stderr =
          err instanceof Error
            ? err.message
            : "Failed to erase flash (via JTAG), due to some unknown error in tcl, please try to relaunch open-ocd";
        const output: CapturedTaskOutput = {
          stdout: "",
          stderr,
          success: false,
          exitCode: -1,
        };
        resolve({
          continueFlag: false,
          executions: [createCapturedExecution(output)],
        });
      })
      .sendCommand(fullCommand);
  });
}
