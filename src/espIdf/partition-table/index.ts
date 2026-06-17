/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 11:35:02 am
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

import { commands, ExtensionContext, l10n, Uri, window } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { flashBinaryToPartition } from "./partitionFlasher";
import { PartitionItem, PartitionTreeDataProvider } from "./tree";
import { openFolderCheck, PreCheck } from "../../common/PreCheck";
import { readPartition } from "./partitionReader";
import { ESP } from "../../config";
import { getSDKConfigFilePath } from "../../configuration/workspace";
import { createFileSync, existsSync, pathExists } from "fs-extra";
import { getConfigValueFromSDKConfig, isStringNotEmpty } from "../../utils";
import { ConfserverProcess } from "../menuconfig/confserver/confServerProcess";
import { join } from "path";
import { Logger } from "../../common/logger";
import { PartitionTableEditorPanel } from "./panel";

export function registerPartitionTableCommands(context: ExtensionContext) {
  const partitionTableTreeDataProvider = new PartitionTreeDataProvider();

  context.subscriptions.push(
    partitionTableTreeDataProvider.registerDataProvider("idfPartitionExplorer")
  );

  registerIDFCommand(
    context,
    "espIdf.flashBinaryToPartition",
    async (binPath: Uri) => {
      if (!binPath) {
        return;
      }
      let items: { label: string; target: string; description: string }[] = [];
      const partitionsInDevice = partitionTableTreeDataProvider.getChildren();
      if (!partitionsInDevice) {
        window.showInformationMessage("No partition found");
      } else {
        for (let devicePartition of partitionsInDevice) {
          const item = {
            label: devicePartition.name,
            target: devicePartition.offset,
            description: String(devicePartition.description),
          };
          items.push(item);
        }
      }
      items.push({
        label: "Custom offset",
        target: "custom",
        description: "Enter a custom offset",
      });
      const partitionAction = await window.showQuickPick(items, {
        placeHolder: l10n.t("Select a partition to use"),
      });
      if (!partitionAction) {
        return;
      }
      if (partitionAction.target === "custom") {
        const customOffset = await window.showInputBox({
          placeHolder: l10n.t("Enter custom partition table offset"),
          value: "",
          validateInput: (text) => {
            return /^(0x[0-9a-fA-F]+|[0-9]+)$/i.test(text)
              ? null
              : "The value is not a valid hexadecimal number";
          },
        });
        if (!customOffset) {
          return;
        }
        partitionAction.target = customOffset;
      }
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      await flashBinaryToPartition(
        partitionAction.target,
        binPath.fsPath,
        wsFolder.uri
      );
    }
  );

  registerIDFCommand(
    context,
    "espIdf.partition.actions",
    (partitionNode: PartitionItem) => {
      if (!partitionNode) {
        return;
      }
      PreCheck.perform([openFolderCheck], async () => {
        const partitionAction = await window.showQuickPick(
          [
            {
              label: l10n.t("Read partition from device"),
              target: "readPartition",
            },
            {
              label: l10n.t(`Flash binary to this partition`),
              target: "flashBinaryToPartition",
            },
          ],
          { placeHolder: l10n.t("Select an action to use") }
        );
        if (!partitionAction) {
          return;
        }
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (partitionAction.target === "flashBinaryToPartition") {
          const selectedFile = await window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: { Binaries: ["bin"] },
          });
          if (selectedFile && selectedFile.length > 0) {
            await flashBinaryToPartition(
              partitionNode.offset,
              selectedFile[0].fsPath,
              wsFolder.uri
            );
          }
        } else if (partitionAction.target === "readPartition") {
          await readPartition(
            partitionNode.name,
            partitionNode.offset,
            partitionNode.size,
            wsFolder.uri
          );
        }
      });
    }
  );

  registerIDFCommand(context, "espIdf.partition.table.refresh", () => {
    PreCheck.perform([openFolderCheck], () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      partitionTableTreeDataProvider.populatePartitionItems(wsFolder.uri);
    });
  });

  registerIDFCommand(
    context,
    "esp.webview.open.partition-table",
    async (args?: Uri) => {
      let filePath = args?.fsPath;
      if (!args) {
        // try to get the partition table name from sdkconfig and if not found create one
        try {
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          const sdkconfigFilePath = await getSDKConfigFilePath(wsFolder.uri);
          if (!sdkconfigFilePath || !(await pathExists(sdkconfigFilePath))) {
            const buildProject = await window.showInformationMessage(
              l10n.t(
                `Partition table editor requires sdkconfig file. Build the project?`
              ),
              "Build"
            );
            if (buildProject === "Build") {
              commands.executeCommand("espIdf.buildDevice");
            }
            return;
          }
          const isCustomPartitionTableEnabled = await getConfigValueFromSDKConfig(
            "CONFIG_PARTITION_TABLE_CUSTOM",
            wsFolder.uri
          );
          if (isCustomPartitionTableEnabled !== "y") {
            const enableCustomPartitionTable = await window.showInformationMessage(
              l10n.t("Custom Partition Table not enabled for the project"),
              "Enable"
            );
            if (enableCustomPartitionTable === "Enable") {
              await ConfserverProcess.initWithProgress(
                wsFolder.uri,
                context.extensionPath
              );

              if (ConfserverProcess.exists()) {
                const customPartitionTableEnableRequest = `{"version": 2, "set": { "PARTITION_TABLE_CUSTOM": true }}\n`;
                ConfserverProcess.sendUpdatedValue(
                  customPartitionTableEnableRequest
                );
                ConfserverProcess.saveGuiConfigValues();
              }
            } else {
              throw new Error(
                l10n.t("Custom Partition Table not enabled for the project")
              );
            }
          }

          let partitionTableFilePath = await getConfigValueFromSDKConfig(
            "CONFIG_PARTITION_TABLE_CUSTOM_FILENAME",
            wsFolder.uri
          );
          partitionTableFilePath = partitionTableFilePath.replace(/\"/g, "");
          if (!isStringNotEmpty(partitionTableFilePath)) {
            throw new Error(
              l10n.t(
                "Empty CONFIG_PARTITION_TABLE_CUSTOM_FILENAME, please add a csv file to generate partition table"
              )
            );
          }

          partitionTableFilePath = join(
            wsFolder.uri.fsPath,
            partitionTableFilePath
          );
          if (!existsSync(partitionTableFilePath)) {
            // inform user and create file.
            Logger.infoNotify(
              l10n.t(
                `Partition Table File {partitionTableFilePath} doesn't exists, we are creating an empty file there`,
                { partitionTableFilePath }
              )
            );
            createFileSync(partitionTableFilePath);
          }
          filePath = partitionTableFilePath;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          return Logger.errorNotify(
            errMsg,
            error as Error,
            "open partitiontable"
          );
        }
      }
      if (!filePath) {
        return;
      }
      PartitionTableEditorPanel.show(context.extensionPath, filePath);
    }
  );
}
