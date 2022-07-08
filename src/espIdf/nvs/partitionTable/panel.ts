/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 15th December 2020 4:48:44 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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
import { basename, dirname, join } from "path";
import * as vscode from "vscode";
import { constants, pathExists, readFile, writeFile } from "fs-extra";
import { Logger } from "../../../logger/logger";
import * as idfConf from "../../../idfConfiguration";
import { canAccessFile, execChildProcess } from "../../../utils";
import { OutputChannel } from "../../../logger/outputChannel";

export class NVSPartitionTable {
  private static currentPanel: NVSPartitionTable;
  private static readonly viewType = "idfNvsPartitionTableEditor";
  private static readonly viewTitle = "ESP-IDF NVS Partition Table Editor";

  public static async createOrShow(
    extensionPath: string,
    filePath: string,
    workspaceFolder: vscode.Uri
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (!!NVSPartitionTable.currentPanel) {
      if (NVSPartitionTable.currentPanel.filePath === filePath) {
        return NVSPartitionTable.currentPanel.panel.reveal(column);
      }
      await NVSPartitionTable.currentPanel.getCSVFromFile(filePath);
      return;
    } else {
      const panel = vscode.window.createWebviewPanel(
        NVSPartitionTable.viewType,
        NVSPartitionTable.viewTitle,
        column,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(join(extensionPath, "dist", "views")),
          ],
          retainContextWhenHidden: true,
        }
      );
      NVSPartitionTable.currentPanel = new NVSPartitionTable(
        extensionPath,
        filePath,
        panel,
        workspaceFolder
      );
    }
  }

  private static sendMessageToPanel(command: string, payload: object) {
    if (this.currentPanel.panel && this.currentPanel.panel.webview) {
      this.currentPanel.panel.webview.postMessage({ command, ...payload });
    }
  }

  private extensionPath: string;
  private filePath: string;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private workspaceFolder: vscode.Uri;

  private constructor(
    extensionPath: string,
    filePath: string,
    panel: vscode.WebviewPanel,
    workspaceFolder: vscode.Uri
  ) {
    this.extensionPath = extensionPath;
    this.filePath = filePath;
    this.panel = panel;
    this.workspaceFolder = workspaceFolder;
    this.panel.iconPath = vscode.Uri.file(
      join(extensionPath, "media", "espressif_icon.png")
    );
    this.panel.webview.onDidReceiveMessage(
      (e) => this.onMessage(e),
      null,
      this.disposables
    );
    this.panel.webview.html = this.createEditorHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async getCSVFromFile(filePath: string) {
    try {
      const fileExists = await pathExists(filePath);
      if (!fileExists) {
        return;
      }
      let csvContent: string = "";
      if (filePath && filePath.endsWith(".csv")) {
        csvContent = await readFile(filePath, "utf-8");
      }
      if (!csvContent) {
        return;
      }
      this.filePath = filePath;
      NVSPartitionTable.sendMessageToPanel("loadInitialData", {
        csv: csvContent,
      });
    } catch (error) {
      error.message
        ? Logger.errorNotify(error.message, error)
        : Logger.errorNotify(`Failed to read CSV from ${filePath}`, error);
    }
  }

  private async generateNvsPartition(
    encrypt: boolean,
    encryptKeyPath: string,
    generateKey: boolean,
    partitionSize: string
  ) {
    try {
      const idfPathDir =
        idfConf.readParameter("idf.espIdfPath", this.workspaceFolder) ||
        process.env.IDF_PATH;
      const pythonBinPath = idfConf.readParameter(
        "idf.pythonBinPath",
        this.workspaceFolder
      ) as string;
      const dirPath = dirname(this.filePath);
      const fileName = basename(this.filePath);
      const resultName = fileName.replace(".csv", ".bin");
      const toolPath = join(
        idfPathDir,
        "components",
        "nvs_flash",
        "nvs_partition_generator",
        "nvs_partition_gen.py"
      );
      if (!canAccessFile(pythonBinPath, constants.R_OK)) {
        Logger.errorNotify(
          "Python binary path is not defined",
          new Error("idf.pythonBinPath is not defined")
        );
      }
      if (!canAccessFile(this.filePath, constants.R_OK)) {
        Logger.warnNotify(
          `${this.filePath} + " is not defined. Save the file first.`
        );
      }
      if (!canAccessFile(toolPath, constants.R_OK)) {
        Logger.errorNotify(
          "nvs_partition_gen.py is not defined",
          new Error(
            "nvs_partition_gen.py is not defined, Make sure idf.espIdfPath is correct."
          )
        );
      }
      const genEncryptPart = encrypt ? "encrypt" : "generate";
      const partToolArgs = [
        toolPath,
        genEncryptPart,
        fileName,
        resultName,
        partitionSize,
      ];
      if (encrypt) {
        const genOrUseKey = generateKey
          ? "--keygen"
          : `--inputkey ${encryptKeyPath}`;
        partToolArgs.push(genOrUseKey);
      }
      OutputChannel.appendLine(`${pythonBinPath} ${partToolArgs.join(" ")}`);
      const result = await execChildProcess(
        `${pythonBinPath} ${partToolArgs.join(" ")}`,
        dirPath
      );
      OutputChannel.appendLine(result);
      Logger.infoNotify(result);

      if (result.indexOf("Created NVS binary: ===>") !== -1) {
        Logger.infoNotify(`Created NVS Binary in ${join(dirPath, resultName)}`);
      }
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Error generating NVS partition";
      OutputChannel.appendLine(msg);
      Logger.errorNotify(msg, error);
    }
  }

  private dispose() {
    NVSPartitionTable.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      disposable.dispose();
    }
  }

  private createEditorHtml(webview: vscode.Webview): string {
    const scriptPath = webview.asWebviewUri(
      vscode.Uri.file(
        join(this.extensionPath, "dist", "views", "nvsPartitionTable-bundle.js")
      )
    );
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ESP-IDF NVS Partition Table Editor</title>
    </head>
    <body>
      <section id="app"></section>
      <script src="${scriptPath}"></script>
    </body>
    </html>`;
  }

  private async onMessage(message: any) {
    switch (message.command) {
      case "getInitialData":
        await this.getCSVFromFile(this.filePath);
        break;
      case "genNvsPartition":
        if (
          typeof message.encrypt !== undefined &&
          typeof message.encryptKeyPath !== undefined &&
          typeof message.generateKey !== undefined &&
          message.partitionSize
        ) {
          await this.generateNvsPartition(
            message.encrypt,
            message.encryptKeyPath,
            message.generateKey,
            message.partitionSize
          );
        }
        break;
      case "openKeyFile":
        const filePath = await this.openFile();
        NVSPartitionTable.sendMessageToPanel("openKeyFile", {
          keyFilePath: filePath,
        });
        break;
      case "showErrorMessage":
        if (message.error) {
          Logger.errorNotify(message.error, new Error(message.error));
        }
      case "saveDataRequest":
        if (message.csv) {
          this.writeCSVDataToFile(message.csv);
        }
        break;
      default:
        break;
    }
  }

  private async openFile() {
    const selectedFile = await vscode.window.showOpenDialog({
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
    });
    if (selectedFile && selectedFile.length > 0) {
      return selectedFile[0].fsPath;
    } else {
      vscode.window.showInformationMessage("No file selected");
    }
  }

  private async writeCSVDataToFile(csv: string) {
    try {
      if (this.filePath && this.filePath.endsWith(".csv")) {
        await writeFile(this.filePath, csv);
        Logger.infoNotify(
          `NVS Partition table is saved successfully. (${this.filePath})`
        );
      }
    } catch (err) {
      return Logger.errorNotify(
        `Failed to save the partition data to the file ${this.filePath} due to some error. Error: ${err.message}`,
        err
      );
    }
  }
}
