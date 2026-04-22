/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 21st April 2026 3:44:55 pm
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
import { interruptMonitorWithDelay } from "./interruptMonitorWithDelay";
import { shouldDisableMonitorReset } from "../../utils";
import { WorkspaceFolder } from "vscode";
import { loadMonitorLaunchConfig } from "./launchConfig";
import { logInvalidConfigReason } from "./configValidation";
import { IDFMonitor } from "./terminal";
import { readParameter } from "../../idfConfiguration";

export async function monitorMain(
  workspaceFolder: WorkspaceFolder,
  noResetMonitor?: boolean
) {
  await interruptMonitorWithDelay(workspaceFolder.uri);
  const noReset =
    typeof noResetMonitor !== "undefined"
      ? noResetMonitor
      : await shouldDisableMonitorReset(workspaceFolder.uri);
  const loaded = await loadMonitorLaunchConfig(workspaceFolder, noReset);
  logInvalidConfigReason(loaded);
  if (loaded.ok === false) {
    return;
  }

  IDFMonitor.updateConfiguration(loaded.config);
  await interruptMonitorWithDelay(workspaceFolder.uri);
  await IDFMonitor.start();
  if (noReset) {
    const monitorDelay = readParameter(
      "idf.monitorDelay",
      workspaceFolder
    ) as number;
    await new Promise((resolve) => setTimeout(resolve, monitorDelay));
  }
}
