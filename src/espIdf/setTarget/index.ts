/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th July 2022 4:13:17 pm
 * Copyright 2022 Espressif Systems (Shanghai) CO LTD
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
  ConfigurationTarget,
  Progress,
  ProgressLocation,
  WorkspaceFolder,
  window,
  l10n,
} from "vscode";
import {
  NotificationMode,
  readParameter,
  writeParameter,
} from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { getBoards, getOpenOcdScripts } from "../openOcd/boardConfiguration";
import { getTargetsFromEspIdf } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";

export async function setIdfTarget(
  placeHolderMsg: string,
  workspaceFolder: WorkspaceFolder
) {
  const configurationTarget = ConfigurationTarget.WorkspaceFolder;
  if (!workspaceFolder) {
    return;
  }

  const notificationMode = readParameter(
    "idf.notificationMode",
    workspaceFolder
  ) as string;
  const progressLocation =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
      ? ProgressLocation.Notification
      : ProgressLocation.Window;
  await window.withProgress(
    {
      cancellable: false,
      location: progressLocation,
      title: "ESP-IDF: Setting device target...",
    },
    async (progress: Progress<{ message: string; increment: number }>) => {
      try {
        const targetsFromIdf = await getTargetsFromEspIdf(workspaceFolder.uri);
        const selectedTarget = await window.showQuickPick(targetsFromIdf);
        if (!selectedTarget) {
          return;
        }
        const openOcdScriptsPath = await getOpenOcdScripts(workspaceFolder.uri);
        const boards = await getBoards(
          openOcdScriptsPath,
          selectedTarget.target
        );
        const choices = boards.map((b) => {
          return {
            description: `${b.description} (${b.configFiles})`,
            label: b.name,
            target: b.configFiles,
          };
        });
        const selectedBoard = await window.showQuickPick(choices, {
          placeHolder: "Enter OpenOCD Configuration File Paths list",
        });
        if (!selectedBoard) {
          Logger.infoNotify(
            `ESP-IDF board not selected. Remember to set the configuration files for OpenOCD with idf.openOcdConfigs`
          );
        } else if (selectedBoard && selectedBoard.target) {
          if (selectedBoard.label.indexOf("Custom board") !== -1) {
            const inputBoard = await window.showInputBox({
              placeHolder: "Enter comma-separated configuration files",
              value: selectedBoard.target.join(","),
            });
            if (inputBoard) {
              selectedBoard.target = inputBoard.split(",");
            }
          }
          await writeParameter(
            "idf.openOcdConfigs",
            selectedBoard.target,
            configurationTarget,
            workspaceFolder.uri
          );
        }
        await setTargetInIDF(workspaceFolder, selectedTarget);
      } catch (err) {
        const errMsg =
          err instanceof Error
            ? err.message
            : l10n.t("Unknown error occurred while setting IDF target.");

        if (errMsg.includes("are satisfied")) {
          Logger.info(errMsg);
          OutputChannel.appendLine(errMsg);
        } else {
          Logger.errorNotify(errMsg, err, "setIdfTarget");
          OutputChannel.appendLine(errMsg);
        }
      }
    }
  );
}
