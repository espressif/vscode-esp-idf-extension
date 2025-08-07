/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 19th July 2021 2:00:26 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { ensureDir, pathExists, readFile, stat } from "fs-extra";
import { EOL } from "os";
import { join } from "path";
import {
  Disposable,
  Event,
  EventEmitter,
  l10n,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  Uri,
  window,
  workspace,
} from "vscode";
import { readParameter, readSerialPort } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import {
  appendIdfAndToolsToPath,
  getConfigValueFromSDKConfig,
  PreCheck,
  spawn,
} from "../../utils";
import { CSV2JSON } from "../../views/partition-table/util";
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { createFlashModel } from "../../flash/flashModelBuilder";
import { formatAsPartitionSize } from "./partitionReader";

export class PartitionItem extends TreeItem {
  name: string;
  type: string;
  subtype: string;
  offset: string;
  size: string;
  flag: Boolean;
  error: string;
}

export class PartitionTreeDataProvider
  implements TreeDataProvider<PartitionItem> {
  public OnDidChangeTreeData: EventEmitter<PartitionItem> = new EventEmitter<
    PartitionItem
  >();
  public readonly onDidChangeTreeData: Event<PartitionItem> = this
    .OnDidChangeTreeData.event;

  public partitionItems: PartitionItem[];
  private readonly PARTITION_TABLE_SIZE = "0xC00";

  public registerDataProvider(treeName: string): Disposable {
    return window.registerTreeDataProvider(treeName, this);
  }

  public getTreeItem(element: PartitionItem): TreeItem {
    return element;
  }

  public getChildren(element?: PartitionItem): PartitionItem[] {
    return this.partitionItems;
  }

  public refresh() {
    this.OnDidChangeTreeData.fire(null);
  }

  public async populatePartitionItems(workspace: Uri) {
    this.partitionItems = Array<PartitionItem>(0);
    try {
      const idfPath = readParameter("idf.espIdfPath", workspace);
      const buildPath = readParameter("idf.buildPath", workspace);
      const flashBaudRate = readParameter("idf.flashBaudRate", workspace);
      const modifiedEnv = await appendIdfAndToolsToPath(workspace);
      const serialPort = await readSerialPort(workspace, false);
      if (!serialPort) {
        return Logger.warnNotify(
          l10n.t(
            "No serial port found for current IDF_TARGET: {0}",
            modifiedEnv["IDF_TARGET"]
          )
        );
      }
      const pythonBinPath = await getVirtualEnvPythonPath(workspace);

      const flasherArgsPath = join(buildPath, "flasher_args.json");

      const flasherArgsExists = await pathExists(flasherArgsPath);
      if (!flasherArgsExists) {
        window.showInformationMessage(
          l10n.t(`{buildFile} doesn't exist. Build first.`, {
            flasherArgsPath,
          })
        );
        return;
      }

      const flasherArgsModel = await createFlashModel(
        flasherArgsPath,
        serialPort,
        flashBaudRate
      );
      let partitionTableOffset = flasherArgsModel.partitionTable.address;

      const partitionTableItem: PartitionItem = {
        name: "partition_table",
        type: "partition_table",
        subtype: "primary",
        offset: partitionTableOffset,
        size: "3K",
        flag: undefined,
        error: undefined,
      };

      const bootloaderFile = join(buildPath, "bootloader", "bootloader.bin");
      const bootloaderFileExists = await pathExists(bootloaderFile);
      if (!bootloaderFileExists) {
        window.showInformationMessage(
          l10n.t(`{buildFile} doesn't exist. Build first.`, {
            bootloaderFile,
          })
        );
        return;
      }
      const bootloaderStats = await stat(bootloaderFile);
      const bootloaderSize = formatAsPartitionSize(bootloaderStats.size);

      const bootloaderItem: PartitionItem = {
        name: "bootloader",
        type: "bootloader",
        subtype: "primary",
        offset: flasherArgsModel.bootloader.address,
        size: bootloaderSize,
        flag: undefined,
        error: undefined,
      };

      await ensureDir(join(workspace.fsPath, "partition_table"));
      const partTableCsv = join(
        workspace.fsPath,
        "partition_table",
        "partitionTable.csv"
      );

      const genEsp32PartPath = join(
        idfPath,
        "components",
        "partition_table",
        "gen_esp32part.py"
      );

      const partTableBin = join(
        buildPath,
        "partition_table",
        "partition-table.bin"
      );

      const partitionTableExists = await pathExists(partTableBin);
      if (!partitionTableExists) {
        window.showInformationMessage(
          l10n.t(`{buildFile} doesn't exist. Build first.`, {
            partTableBin,
          })
        );
        return;
      }

      await spawn(
        pythonBinPath,
        [
          genEsp32PartPath,
          "-o",
          partitionTableOffset,
          partTableBin,
          partTableCsv,
        ],
        {
          cwd: workspace.fsPath,
          env: modifiedEnv,
        }
      );
      const csvData = await readFile(partTableCsv);
      let csvItems = CSV2JSON<PartitionItem>(csvData.toString());
      this.partitionItems = this.createPartitionItemNode([
        bootloaderItem,
        partitionTableItem,
        ...csvItems,
      ]);
    } catch (error) {
      let msg = error.message
        ? error.message
        : "Error getting partitions from device";
      Logger.errorNotify(
        msg,
        error,
        "PartitionTreeDataProvider populatePartitionItems"
      );
    }
    this.refresh();
  }

  private createPartitionItemNode(csvItems: PartitionItem[]) {
    let partitionItems: PartitionItem[] = [];

    for (const item of csvItems) {
      const partitionTableNode = new PartitionItem(item.name);
      partitionTableNode.name = item.name;
      partitionTableNode.type = item.type;
      partitionTableNode.subtype = item.subtype;
      partitionTableNode.offset = item.offset;
      partitionTableNode.size = item.size;
      partitionTableNode.flag = item.flag;
      partitionTableNode.error = item.error;
      partitionTableNode.command = {
        command: "espIdf.partition.actions",
        title: "Show partition actions",
        arguments: [partitionTableNode],
      };
      partitionTableNode.iconPath = new ThemeIcon("file-binary");
      partitionTableNode.description = `Offset (${item.offset
        .toUpperCase()
        .replace("0X", "0x")}) size: (${item.size})`;
      partitionItems.push(partitionTableNode);
    }
    return partitionItems;
  }
}
