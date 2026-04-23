/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 29th September 2020 11:05:15 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { IdfTaskExecution } from "../../../taskManager";
import {
  CapturedTaskOutput,
  CustomExecutionTaskResult,
} from "../../../taskManager/customExecution";

export function createCapturedExecution(
  output: CapturedTaskOutput
): IdfTaskExecution {
  return ({
    getOutput: async () => output,
  } as unknown) as IdfTaskExecution;
}

/**
 * Escape backslashes and double quotes, then wrap for OpenOCD TCL double-quoted
 * string arguments (prevents breaking out of the quoted token).
 */
export function quoteTclArg(arg: string): string {
  const escaped = arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export async function jtagFlash(
  client: TCLClient,
  command: string,
  ...args: string[]
): Promise<CustomExecutionTaskResult> {
  const fullCommand = `${command} ${args.map(quoteTclArg).join(" ")}`;

  return new Promise<CustomExecutionTaskResult>((resolve) => {
    let settled = false;
    const finish = (result: CustomExecutionTaskResult) => {
      if (settled) {
        return;
      }
      settled = true;
      client.off("response", onResponse);
      client.off("error", onError);
      resolve(result);
    };

    const onResponse = (data: Buffer) => {
      const response = data
        .toString()
        .replace(TCLClient.DELIMITER, "")
        .trim();
      const success = response === "0";
      const stderr = success
        ? ""
        : `Failed to flash the device (JTAG), please try again [got response: '${response}', expecting: '0']`;
      const output: CapturedTaskOutput = {
        stdout: response,
        stderr,
        success,
        exitCode: success ? 0 : -1,
      };
      finish({
        continueFlag: success,
        executions: [createCapturedExecution(output)],
      });
    };

    const onError = (err: unknown) => {
      const stderr =
        err instanceof Error
          ? err.message
          : "Failed to flash (via JTAG), due to some unknown error in tcl, please try to relaunch open-ocd";
      const output: CapturedTaskOutput = {
        stdout: "",
        stderr,
        success: false,
        exitCode: -1,
      };
      finish({
        continueFlag: false,
        executions: [createCapturedExecution(output)],
      });
    };

    client.once("response", onResponse);
    client.once("error", onError);
    client.sendCommand(fullCommand);
  });
}
