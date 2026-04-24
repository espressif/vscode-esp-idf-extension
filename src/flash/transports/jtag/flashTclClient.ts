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
import { Logger } from "../../../logger/logger";
import {
  CaptureableTaskExecution,
  CapturedTaskOutput,
  CustomExecutionTaskResult,
} from "../../../taskManager/customExecution";

export function createCapturedExecution(
  output: CapturedTaskOutput
): CaptureableTaskExecution {
  return {
    getOutput: async () => output,
  };
}

/**
 * Escapes characters that would break or reinterpret a TCL double-quoted string
 * (backslash, double quote, dollar, left bracket), then wraps the value in
 * double quotes for safe use as an OpenOCD TCL argument.
 */
export function quoteTclArg(arg: string): string {
  const escaped = arg
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/\[/g, "\\[");
  return `"${escaped}"`;
}

const JTAG_FLASH_TCL_RESPONSE_TIMEOUT_MS = 120_000;

export async function jtagFlash(
  client: TCLClient,
  command: string,
  ...args: string[]
): Promise<CustomExecutionTaskResult> {
  const fullCommand = `${command} ${args.map(quoteTclArg).join(" ")}`;

  return new Promise<CustomExecutionTaskResult>((resolve) => {
    let settled = false;
    let responseTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: CustomExecutionTaskResult) => {
      if (settled) {
        return;
      }
      settled = true;
      if (responseTimeoutId !== undefined) {
        clearTimeout(responseTimeoutId);
        responseTimeoutId = undefined;
      }
      client.off("response", onResponse);
      client.off("error", onError);
      resolve(result);
    };

    const onResponse = (data: Buffer) => {
      const response = data
        .toString()
        .split(TCLClient.DELIMITER)
        .join("")
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
      Logger.error(
        "jtagFlash OpenOCD TCL error",
        err instanceof Error ? err : new Error(String(err)),
        "jtagFlash onError"
      );
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
    responseTimeoutId = setTimeout(() => {
      const output: CapturedTaskOutput = {
        stdout: "",
        stderr: `JTAG flash timed out after ${JTAG_FLASH_TCL_RESPONSE_TIMEOUT_MS / 1000}s waiting for OpenOCD TCL response.`,
        success: false,
        exitCode: -1,
      };
      finish({
        continueFlag: false,
        executions: [createCapturedExecution(output)],
      });
    }, JTAG_FLASH_TCL_RESPONSE_TIMEOUT_MS);
    try {
      client.sendCommand(fullCommand);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(
        "jtagFlash OpenOCD TCL sendCommand failed",
        err,
        "jtagFlash sendCommand"
      );
      const output: CapturedTaskOutput = {
        stdout: "",
        stderr: err.message,
        success: false,
        exitCode: -1,
      };
      finish({
        continueFlag: false,
        executions: [createCapturedExecution(output)],
      });
    }
  });
}
