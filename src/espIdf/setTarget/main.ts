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
  QuickPickItemKind,
  l10n,
} from "vscode";
import {
  NotificationMode,
  readParameter,
  writeParameter,
} from "../../configuration/idf";
import {
  idfTaskInProgress,
  IdfTaskName,
} from "../../common/error/knownError";
import { selectOpenOcdConfigFiles } from "../openOcd/boardConfiguration";
import { applyOpenOcdBoardSelection } from "../openOcd/applyOpenOcdBoardSelection";
import { detectConnectedBoards } from "../openOcd/detectConnectedBoards";
import { getTargetsFromEspIdf, IdfTarget } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";
import { updateCurrentProfileIdfTarget } from "../../project-conf";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";
import { setTargetErrorPresentation } from "./setTargetErrorPresentation";

export let isSettingIDFTarget = false;

export interface ISetTargetQuickPickItems {
  label: string;
  idfTarget: IdfTarget;
  boardInfo?: {
    location: string;
    config_files: string[];
    serial_number?: string;
  };
  description?: string;
  isConnected?: boolean;
  kind?: QuickPickItemKind;
}

export function setIsSettingIDFTarget(value: boolean) {
  isSettingIDFTarget = value;
}

export async function setIdfTarget(
  placeHolderMsg: string,
  workspaceFolder: WorkspaceFolder
) {
  const configurationTarget = ConfigurationTarget.WorkspaceFolder;
  if (!workspaceFolder) {
    return;
  }
  if (isSettingIDFTarget) {
    throw idfTaskInProgress(
      IdfTaskName.SetTarget,
      setTargetErrorPresentation.idfTaskInProgress
    );
  }
  setIsSettingIDFTarget(true);

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
    async (_progress: Progress<{ message: string; increment: number }>) => {
      try {
        const targetsFromIdf = await getTargetsFromEspIdf();
        const { boards: detectedBoards, openOCDVersion } =
          await detectConnectedBoards(workspaceFolder);

        const connectedBoards: ISetTargetQuickPickItems[] = detectedBoards.flatMap(
          (b) => {
            const idfTarget = targetsFromIdf.find((t) => t.target === b.target);
            if (!idfTarget) {
              return [];
            }
            return [
              {
                label: b.name,
                idfTarget,
                description: b.description,
                detail:
                  l10n.t("Status: CONNECTED") +
                  (b.location
                    ? `   ${l10n.t("Location: {0}", b.location)}`
                    : ""),
                isConnected: true,
                boardInfo: {
                  location: b.location,
                  config_files: b.config_files,
                  serial_number: b.serial_number,
                },
              } as ISetTargetQuickPickItems,
            ];
          }
        );

        const defaultBoards: ISetTargetQuickPickItems[] = targetsFromIdf.map(
          (t) => ({
            label: t.label,
            idfTarget: t,
            description: t.isPreview ? l10n.t("Preview target") : undefined,
            isConnected: false,
          })
        );

        const quickPickItems: ISetTargetQuickPickItems[] =
          connectedBoards.length > 0
            ? [
                ...connectedBoards,
                {
                  kind: QuickPickItemKind.Separator,
                  label: l10n.t("Default Boards"),
                  idfTarget: { label: "", target: "", isPreview: false },
                },
                ...defaultBoards,
              ]
            : defaultBoards;
        const selectedTarget = await window.showQuickPick(quickPickItems, {
          placeHolder: placeHolderMsg,
          ignoreFocusOut: true,
        });
        if (!selectedTarget) {
          return;
        }

        if (selectedTarget.isConnected && selectedTarget.boardInfo) {
          await applyOpenOcdBoardSelection(
            workspaceFolder,
            {
              configFiles: selectedTarget.boardInfo.config_files || [],
              isConnected: true,
              location: selectedTarget.boardInfo.location,
              serialNumber: selectedTarget.boardInfo.serial_number,
            },
            openOCDVersion,
            { notify: false }
          );
        } else {
          await selectOpenOcdConfigFiles(
            workspaceFolder,
            selectedTarget.idfTarget.target
          );
        }

        await updateCurrentProfileIdfTarget(
          selectedTarget.idfTarget.target,
          workspaceFolder.uri
        );

        await setTargetInIDF(workspaceFolder.uri, selectedTarget.idfTarget);

        // Re-read after OpenOCD selection so location/serial writes are not overwritten
        const customExtraVars = {
          ...(readParameter("idf.customExtraVars", workspaceFolder) as {
            [key: string]: string;
          }),
        };
        customExtraVars["IDF_TARGET"] = selectedTarget.idfTarget.target;
        await writeParameter(
          "idf.customExtraVars",
          customExtraVars,
          configurationTarget,
          workspaceFolder
        );
        updateOpenOcdAdapterStatusBarItem(workspaceFolder.uri);
      } finally {
        setIsSettingIDFTarget(false);
      }
    }
  );
}
