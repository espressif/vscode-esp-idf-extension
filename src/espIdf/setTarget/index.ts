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
  window,
} from "vscode";
import { readParameter, writeParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { getBoards, getOpenOcdScripts } from "../openOcd/boardConfiguration";
import { getTargetsFromEspIdf } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";

export async function setIdfTarget(placeHolderMsg: string) {
  const configurationTarget = ConfigurationTarget.WorkspaceFolder;
  let workspaceFolder = await window.showWorkspaceFolderPick({
    placeHolder: `Pick Workspace Folder to which settings should be applied`,
  });
  if (!workspaceFolder) {
    return;
  }

  await window.withProgress(
    {
      cancellable: false,
      location: ProgressLocation.Notification,
      title: "ESP-IDF: Setting device target...",
    },
    async (progress: Progress<{ message: string; increment: number }>) => {
      try {
        const openOcdScriptsPath = getOpenOcdScripts(workspaceFolder.uri);
        const boards = await getBoards(openOcdScriptsPath);
        const targetsFromIdf = await getTargetsFromEspIdf(workspaceFolder.uri);
        const selectedTarget = await window.showQuickPick(targetsFromIdf);
        if (!selectedTarget) {
          return;
        }
        if (selectedTarget.target === "custom") {
          const currentValue = readParameter(
            "idf.customAdapterTargetName",
            workspaceFolder.uri
          ) as string;
          const customIdfTarget = await window.showInputBox({
            placeHolder: placeHolderMsg,
            value: currentValue,
          });
          if (!customIdfTarget) {
            return;
          }
          await writeParameter(
            "idf.adapterTargetName",
            selectedTarget.target,
            configurationTarget,
            workspaceFolder.uri
          );
          await writeParameter(
            "idf.customAdapterTargetName",
            customIdfTarget,
            configurationTarget,
            workspaceFolder.uri
          );
          return Logger.infoNotify(
            `IDF_TARGET has been set to custom. Remember to set the configuration files for OpenOCD`
          );
        }
        await writeParameter(
          "idf.adapterTargetName",
          selectedTarget.target,
          configurationTarget,
          workspaceFolder.uri
        );

        const boardsForTarget = boards.filter(
          (b) => b.target === selectedTarget.target
        );
        const choices = boardsForTarget.map((b) => {
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
              placeHolder: "Enter comma separated configuration files",
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
          err && err.message ? err.message : "Error running idf.py set-target";
        if (errMsg.indexOf("are satisfied") > -1) {
          Logger.info(err.message.toString());
          OutputChannel.append(err.message.toString());
        } else {
          Logger.errorNotify(err, err);
          OutputChannel.append(err);
        }
      }
    }
  );
}
