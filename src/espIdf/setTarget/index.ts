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
import { selectOpenOcdConfigFiles } from "../openOcd/boardConfiguration";
import { getTargetsFromEspIdf } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";
import { updateCurrentProfileIdfTarget } from "../../project-conf";

export let isSettingIDFTarget = false;

export async function setIdfTarget(
  placeHolderMsg: string,
  workspaceFolder: WorkspaceFolder
) {
  const configurationTarget = ConfigurationTarget.WorkspaceFolder;
  if (!workspaceFolder) {
    return;
  }
  if (isSettingIDFTarget) {
    Logger.info("setTargetInIDF is already running.");
    return;
  }
  isSettingIDFTarget = true;

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
        await selectOpenOcdConfigFiles(
          workspaceFolder.uri,
          selectedTarget.target
        );

        await setTargetInIDF(workspaceFolder, selectedTarget);
        const customExtraVars = readParameter(
          "idf.customExtraVars",
          workspaceFolder
        ) as { [key: string]: string };
        customExtraVars["IDF_TARGET"] = selectedTarget.target;
        await writeParameter(
          "idf.customExtraVars",
          customExtraVars,
          configurationTarget,
          workspaceFolder.uri
        );
        await updateCurrentProfileIdfTarget(
          selectedTarget.target,
          workspaceFolder.uri
        );
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
      } finally {
        isSettingIDFTarget = false;
      }
    }
  );
}
