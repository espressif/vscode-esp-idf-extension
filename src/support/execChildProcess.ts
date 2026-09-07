/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:18:11 pm
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
import {
  execFile,
  ExecFileException,
  ExecFileOptions,
} from "child_process";
import { childProcessFailedFromInvocation } from "../common/error/knownError";
import { sanitizeSpawnInvocation } from "../utils";

export function execChildProcess(
  command: string,
  args: string[] = [],
  pathWhereToExecute: string,
  opts?: Omit<ExecFileOptions, "shell">
) {
  return new Promise<string>((resolve, reject) => {
    let safeCommand: string;
    let safeArgs: string[];
    try {
      ({ command: safeCommand, args: safeArgs } = sanitizeSpawnInvocation(
        command,
        args
      ));
    } catch (validationError) {
      return reject(validationError);
    }
    const execOpts: ExecFileOptions = {
      cwd: pathWhereToExecute,
      env: opts?.env,
      uid: opts?.uid,
      gid: opts?.gid,
      timeout: opts?.timeout,
      killSignal: opts?.killSignal,
      windowsHide: opts?.windowsHide,
      windowsVerbatimArguments: opts?.windowsVerbatimArguments,
      maxBuffer: opts?.maxBuffer ?? 500 * 1024,
      encoding: opts?.encoding,
      shell: false,
    };
    execFile(
      safeCommand,
      safeArgs,
      execOpts,
      (error: ExecFileException | null, stdout: string, stderr: string) => {
        if (error) {
          return reject(
            childProcessFailedFromInvocation(command, args, {
              stdout,
              stderr,
              exitCode: typeof error.code === "number" ? error.code : undefined,
              spawnError: error,
            })
          );
        }
        if (stderr && stderr.length) {
          return resolve("".concat(stderr, stdout));
        }
        return resolve(stdout);
      }
    );
  });
}
