/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 10th April 2026 3:14:12 pm
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

import {
  CancellationToken,
  l10n,
  Progress,
  ProgressLocation,
  window,
  WorkspaceFolder,
} from "vscode";
import { Logger } from "../logger/logger";
import { openFolderCheck, PreCheck, PreCheckInput } from "./PreCheck";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { ESP } from "../config";

export type WithProgressTask<T = void> = (
  progress: Progress<{ message: string; increment: number }>,
  token: CancellationToken,
  workspaceFolder: WorkspaceFolder
) => Promise<T>;

export type WithProgressWrapperOptions = {
  /**
   * Runs after pre-checks pass. Return false to skip `window.withProgress` (for example when
   * delegating the action to another extension).
   */
  afterPreCheckProceed?: () => Promise<boolean>;
  /**
   * When set, used for notification placement and configuration scope instead of the globally
   * selected workspace folder (for example build/flash against an explicit folder).
   */
  workspaceFolder?: WorkspaceFolder | undefined;
};

function progressLocationForNotificationSetting(
  workspaceFolder: WorkspaceFolder | undefined
): ProgressLocation {
  const notificationMode = readParameter(
    "idf.notificationMode",
    workspaceFolder
  ) as string;
  return notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
    ? ProgressLocation.Notification
    : ProgressLocation.Window;
}

export async function withProgressWrapper<T = void>(
  preChecks: PreCheckInput[],
  progressTitle: string,
  task: WithProgressTask<T>,
  options?: WithProgressWrapperOptions
): Promise<T | undefined> {
  return PreCheck.perform(preChecks, async () => {
    if (options?.afterPreCheckProceed) {
      const proceed = await options.afterPreCheckProceed();
      if (!proceed) {
        return undefined as T;
      }
    }
    const wsFolder =
      options?.workspaceFolder ??
      ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
    if (!wsFolder) {
      PreCheck.perform([openFolderCheck], () => {
        Logger.errorNotify(
          l10n.t("Unable to resolve the workspace folder for this action."),
          new Error("WORKSPACE_FOLDER_UNRESOLVED"),
          "withProgressWrapper",
          undefined,
          false
        );
      });
      return undefined as T;
    }
    const location = progressLocationForNotificationSetting(wsFolder);
    return window.withProgress(
      {
        cancellable: true,
        location,
        title: progressTitle,
      },
      async (progress, token) => task(progress, token, wsFolder)
    );
  });
}
