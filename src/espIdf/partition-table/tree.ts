/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 19th July 2021 2:00:26 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
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

  public async populatePartitionItems() {
    this.partitionItems = Array<PartitionItem>(0);
    const workspaceFolder = PreCheck.isWorkspaceFolderOpen()
      ? workspace.workspaceFolders[0].uri.fsPath
      : "";
    try {
      const modifiedEnv = appendIdfAndToolsToPath();
      const serialPort = readParameter("idf.port") as string;
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
        partitionTableOffset = getConfigValueFromSDKConfig(
          "CONFIG_PARTITION_TABLE_OFFSET",
          workspaceFolder
        );
      } else if (partitionTableOffsetOption.target.indexOf("custom") !== -1) {
        partitionTableOffset = await window.showInputBox({
          placeHolder: "Enter custom partition table offset",
          value: "",
          validateInput: (text) => {
            return /^[0-9A-Fa-f]+$/i.test(text)
              ? null
              : "The value is not a valid hexadecimal number";
          },
        });
      }

      ensureDir(join(workspaceFolder, "partition_table"));
      const partTableBin = join(
        workspaceFolder,
        "partition_table",
        "partitionTable.bin"
      );
      const partTableCsv = join(
        workspaceFolder,
        "partition_table",
        "partitionTable.csv"
      );

      await spawn(
        "esptool.py",
        [
          "-p",
          serialPort,
          "read_flash",
          partitionTableOffset,
          this.PARTITION_TABLE_SIZE,
          partTableBin,
        ],
        {
          cwd: workspaceFolder,
          env: modifiedEnv,
        }
      );

      await spawn("gen_esp32part.py", [partTableBin, partTableCsv], {
        cwd: workspaceFolder,
        env: modifiedEnv,
      });
      const csvData = await readFile(partTableCsv);
      let csvItems = this.CSV2JSON(csvData.toString());
      this.partitionItems = this.createPartitionItemNode(csvItems);
    } catch (error) {
      let msg = error.message
        ? error.message
        : "Error getting partitions from device";
      Logger.errorNotify(msg, error);
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

  public CSV2JSON(csv: String): PartitionItem[] {
    const rows = new Array<PartitionItem>();
    const lines = csv.split(EOL);
    const comment = lines.shift();
    if (!comment.includes("# ESP-IDF Partition Table")) {
      console.log("Not a partition table csv, skipping...");
      return rows;
    }
    const headers = lines.shift();
    lines.forEach((line) => {
      if (line === "") {
        return;
      }
      const cols = line.split(",");
      rows.push({
        name: cols.shift(),
        type: cols.shift(),
        subtype: cols.shift(),
        offset: cols.shift(),
        size: cols.shift(),
        flag: cols.shift() === "encrypted" ? true : false,
        error: undefined,
      });
    });
    return rows;
  }
}
