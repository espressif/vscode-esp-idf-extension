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

import { ensureDir, readFile } from "fs-extra";
import { EOL } from "os";
import { join } from "path";
import {
  Disposable,
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  Uri,
  window,
  workspace,
} from "vscode";
import { readParameter } from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import {
  appendIdfAndToolsToPath,
  getConfigValueFromSDKConfig,
  PreCheck,
  spawn,
} from "../../utils";
import { CSV2JSON } from "../../views/partition-table/util";
import { getVirtualEnvPythonPath } from "../../pythonManager";

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
      const modifiedEnv = await appendIdfAndToolsToPath(workspace);
      const serialPort = readParameter("idf.port", workspace) as string;
      const idfPath = modifiedEnv["IDF_PATH"];
      const pythonBinPath = await getVirtualEnvPythonPath(workspace);
      const partitionTableOffsetOption = await window.showQuickPick(
        [
          {
            label: `Use sdkconfig offset`,
            target: "sdkconfig",
          },
          {
            label: `Specify partition table offset`,
            target: "custom",
          },
        ],
        { placeHolder: "Select partition table offset to use" }
      );
      if (!partitionTableOffsetOption) {
        return;
      }
      let partitionTableOffset = "";
      if (partitionTableOffsetOption.target.indexOf("sdkconfig") !== -1) {
        partitionTableOffset = await getConfigValueFromSDKConfig(
          "CONFIG_PARTITION_TABLE_OFFSET",
          workspace
        );
      } else if (partitionTableOffsetOption.target.indexOf("custom") !== -1) {
        partitionTableOffset = await window.showInputBox({
          placeHolder: "Enter custom partition table offset",
          value: "",
          validateInput: (text) => {
            return /^(0x[0-9a-fA-F]+|[0-9]+)$/i.test(text)
              ? null
              : "The value is not a valid hexadecimal number";
          },
        });
        if (partitionTableOffset === undefined) {
          return;
        }
      }

      ensureDir(join(workspace.fsPath, "partition_table"));
      const partTableBin = join(
        workspace.fsPath,
        "partition_table",
        "partitionTable.bin"
      );
      const partTableCsv = join(
        workspace.fsPath,
        "partition_table",
        "partitionTable.csv"
      );

      const esptoolPath = join(
        idfPath,
        "components",
        "esptool_py",
        "esptool",
        "esptool.py"
      );

      const genEsp32PartPath = join(
        idfPath,
        "components",
        "partition_table",
        "gen_esp32part.py"
      );

      await spawn(
        pythonBinPath,
        [
          esptoolPath,
          "-p",
          serialPort,
          "read_flash",
          partitionTableOffset,
          this.PARTITION_TABLE_SIZE,
          partTableBin,
        ],
        {
          cwd: workspace.fsPath,
          env: modifiedEnv,
        }
      );

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
      this.partitionItems = this.createPartitionItemNode(csvItems);
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
      partitionTableNode.description = `Offset (${item.offset.toUpperCase()}) size: (${
        item.size
      })`;
      partitionItems.push(partitionTableNode);
    }
    return partitionItems;
  }
}
