/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th December 2020 5:18:11 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { exec, ExecOptions } from "child_process";

export function execChildProcess(
  cmd: string,
  pathWhereToExecute: string,
  opts?: ExecOptions
) {
  if (!opts) {
    opts = {
      cwd: pathWhereToExecute,
      maxBuffer: 500 * 1024,
    };
  }
  return new Promise<string>((resolve, reject) => {
    exec(cmd, opts, (error: Error, stdout: string, stderr: string) => {
      if (error) {
        return reject(error);
      }
      if (stderr && stderr.length) {
        return resolve("".concat(stderr, stdout));
      }
      return resolve(stdout);
    });
  });
}
