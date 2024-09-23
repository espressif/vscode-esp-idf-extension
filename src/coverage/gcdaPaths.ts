/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 18th December 2023 6:27:12 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { readdir, stat } from "fs-extra";
import { extname, join } from "path";
import { Uri } from "vscode";
import { getGcovExecutable } from "./coverageService";
import { readParameter } from "../idfConfiguration";
import { exec } from "child_process";
import { appendIdfAndToolsToPath } from "../utils";
import { IGcovOutput } from "./gcovData";
import { Logger } from "../logger/logger";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";

export async function getGcdaPaths(workspaceFolder: Uri) {
  const gcdaPaths: Set<string> = new Set();

  async function searchFiles(currentPath: string) {
    const dirFiles = await readdir(currentPath);

    for (const file of dirFiles) {
      const filePath = join(currentPath, file);

      const pathStats = await stat(filePath);

      if (pathStats.isDirectory()) {
        await searchFiles(filePath);
      } else if (extname(filePath) === ".gcda") {
        gcdaPaths.add(filePath);
      }
    }
  }

  await searchFiles(workspaceFolder.fsPath);

  return Array.from(gcdaPaths);
}

export async function getGcovData(workspaceFolder: Uri) {
  const idfTarget =
    (await getIdfTargetFromSdkconfig(workspaceFolder)) || "esp32";
  const gcovExecutable = getGcovExecutable(idfTarget);

  const gcdaPaths = await getGcdaPaths(workspaceFolder);

  let command = `"${gcovExecutable}" -b --stdout --json-format`;
  for (const path of gcdaPaths) {
    command += ` "${path}"`;
  }

  return new Promise<IGcovOutput[]>(async (resolve, reject) => {
    const modifiedEnv = await appendIdfAndToolsToPath(workspaceFolder);
    exec(
      command,
      {
        maxBuffer: 256 * 1024 * 1024,
        env: modifiedEnv,
        cwd: workspaceFolder.fsPath,
      },
      (err, stdout, stderr) => {
        if (err) {
          const msg = err && err.message ? err.message : err;
          Logger.error(`exec error: ${msg}`, err);
          return reject(err);
        }
        const output = [];
        if (!stdout) {
          return reject(stderr);
        }
        const parts = stdout.toString().split("\n");
        for (const part of parts) {
          if (part.length === 0) {
            continue;
          }
          output.push(JSON.parse(part));
        }
        return resolve(output);
      }
    );
  });
}
