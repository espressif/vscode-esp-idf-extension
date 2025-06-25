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
  QuickPickItemKind,
  debug,
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
import { DevkitsCommand } from "./DevkitsCommand";

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
        let connectedBoards: any[] = [];

        const isDebugging = debug.activeDebugSession !== undefined;

        if (!isDebugging) {
          try {
            const devkitsCmd = new DevkitsCommand(workspaceFolder.uri);
            const scriptPath = await devkitsCmd.getScriptPath();
            
            if (scriptPath) {
              const devkitsOutput = await devkitsCmd.runDevkitsScript();
              if (devkitsOutput) {
                const parsed = JSON.parse(devkitsOutput);
                if (parsed && Array.isArray(parsed.boards)) {
                  connectedBoards = parsed.boards.map((b: any) => ({
                    label: b.name,
                    target: b.target,
                    description: b.description,
                    detail: `Status: CONNECTED${
                      b.location ? `   Location: ${b.location}` : ""
                    }`,
                    isConnected: true,
                    boardInfo: b,
                  }));
                }
              }
            } else {
              Logger.info(
                "Devkit detection script not available. A default list of targets will be displayed instead."
              );
            }
          } catch (e) {
            Logger.info(
              "No connected boards detected or error running DevkitsCommand: " +
                (e && e.message ? e.message : e)
            );
          }
        } else {
          Logger.info(
            "Connected ESP-IDF devkit detection is skipped while debugging. You can still select a target manually."
          );
        }
        let quickPickItems: any[] = [];
        if (connectedBoards.length > 0) {
          quickPickItems = [
            ...connectedBoards,
            { kind: QuickPickItemKind.Separator, label: "Default Boards" },
            ...targetsFromIdf.map((t) => ({
              label: t.label,
              target: t.target,
              description: t.isPreview ? "Preview target" : undefined,
              isConnected: false,
            })),
          ];
        } else {
          quickPickItems = targetsFromIdf.map((t) => ({
            label: t.label,
            target: t.target,
            description: t.isPreview ? "Preview target" : undefined,
            isConnected: false,
          }));
        }
        const selectedTarget = await window.showQuickPick(quickPickItems, {
          placeHolder: placeHolderMsg,
        });
        if (!selectedTarget) {
          return;
        }
        if (selectedTarget.isConnected && selectedTarget.boardInfo) {
          // Directly set OpenOCD configs for connected board
          const configFiles = selectedTarget.boardInfo.config_files || [];
          await writeParameter(
            "idf.openOcdConfigs",
            configFiles,
            configurationTarget,
            workspaceFolder.uri
          );
          // Store USB location if available
          if (selectedTarget.boardInfo.location) {
            const customExtraVars = readParameter(
              "idf.customExtraVars",
              workspaceFolder
            ) as { [key: string]: string };
            const location = selectedTarget.boardInfo.location.replace(
              "usb://",
              ""
            );
            customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"] = location;
            await writeParameter(
              "idf.customExtraVars",
              customExtraVars,
              configurationTarget,
              workspaceFolder.uri
            );
          }
        } else {
          await selectOpenOcdConfigFiles(
            workspaceFolder.uri,
            selectedTarget.target
          );
        }

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
