/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th June 2019 2:03:34 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import * as vscode from "vscode";
import * as idfConf from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { spawn } from "../../utils";
import { SerialPortDetails } from "./serialPortDetails";
import { OutputChannel } from "../../logger/outputChannel";
import * as SerialPortLib from "serialport";
import { ESP } from "../../config";

export class SerialPort {
  public static shared(): SerialPort {
    if (!SerialPort.instance) {
      SerialPort.instance = new SerialPort();
    }
    return SerialPort.instance;
  }

  private static instance: SerialPort;
  public promptUserToSelect(workspaceFolder: vscode.Uri) {
    return SerialPort.shared().displayList(workspaceFolder);
  }
  private async displayList(workspaceFolder: vscode.Uri) {
    const msg = vscode.l10n.t(
      "Select the available serial port where your device is connected."
    );

    try {
      let portList: SerialPortDetails[] = await this.list(workspaceFolder);
      const chosen = await vscode.window.showQuickPick(
        portList.map((l: SerialPortDetails) => {
          return {
            description: l.chipType || l.manufacturer,
            label: l.comName,
          };
        }),
        { placeHolder: msg }
      );
      if (chosen && chosen.label) {
        await this.updatePortListStatus(chosen.label, workspaceFolder);
      }
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Something went wrong while getting the serial port list";
      Logger.errorNotify(msg, error);
      OutputChannel.appendLine(msg, "Serial port");
      OutputChannel.appendLineAndShow(JSON.stringify(error));
    }
  }

  public async getListArray(workspaceFolder: vscode.Uri) {
    return await this.list(workspaceFolder);
  }

  private async updatePortListStatus(l: string, wsFolder: vscode.Uri) {
    const settingsSavedLocation = await idfConf.writeParameter(
      "idf.port",
      l,
      vscode.ConfigurationTarget.WorkspaceFolder,
      wsFolder
    );
    const portHasBeenSelectedMsg = vscode.l10n.t("Port has been updated to ");
    Logger.infoNotify(
      `${portHasBeenSelectedMsg}${l} in ${settingsSavedLocation}`
    );
  }

  private list(workspaceFolder: vscode.Uri): Thenable<SerialPortDetails[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const listOfSerialPorts = await SerialPortLib.SerialPort.list();

        if (!listOfSerialPorts || listOfSerialPorts.length === 0) {
          reject(new Error("No serial ports found"));
          return;
        }

        let choices = listOfSerialPorts.map((item) => {
          return new SerialPortDetails(
            item.path,
            item.manufacturer,
            item.vendorId,
            item.productId
          );
        });
        const pythonBinPath = idfConf.readParameter(
          "idf.pythonBinPath",
          workspaceFolder
        ) as string;
        const idfPath = idfConf.readParameter(
          "idf.espIdfPath",
          workspaceFolder
        );
        const enableSerialPortChipIdRequest = idfConf.readParameter(
          "idf.enableSerialPortChipIdRequest",
          workspaceFolder
        ) as boolean;
        const useSerialPortVendorProductFilter = idfConf.readParameter(
          "idf.enableSerialPortChipIdRequest",
          workspaceFolder
        ) as boolean;
        if (useSerialPortVendorProductFilter) {
          choices = choices.filter((port) => {
            const vendorIdNumber = parseInt(port.vendorId, 16);
            const productIdNumber = parseInt(port.productId, 16);
            return ESP.USB_PORT_FILTERS.some(
              (filter) =>
                filter.vendorId === vendorIdNumber &&
                filter.productId === productIdNumber
            );
          });
        }

        if (!enableSerialPortChipIdRequest) {
          return choices;
        }

        const esptoolPath = join(
          idfPath,
          "components",
          "esptool_py",
          "esptool",
          "esptool.py"
        );
        const stat = await vscode.workspace.fs.stat(
          vscode.Uri.file(esptoolPath)
        );
        if (stat.type !== vscode.FileType.File) {
          // esptool.py does not exists
          throw new Error(`esptool.py does not exists in ${esptoolPath}`);
        }
        async function processPorts(serialPort: SerialPortDetails) {
          try {
            const chipIdBuffer = await spawn(
              pythonBinPath,
              [esptoolPath, "--port", serialPort.comName, "chip_id"],
              {},
              2000, // success is quick, failing takes too much time
              true
            );
            const regexp = /Chip is(.*?)[\r]?\n/;
            const chipIdString = chipIdBuffer.toString().match(regexp);

            serialPort.chipType =
              chipIdString && chipIdString.length > 1
                ? chipIdString[1].trim()
                : undefined;
          } catch (error) {
            serialPort.chipType = undefined;
          }
          return serialPort;
        }

        resolve(
          await Promise.all(
            choices.map((item) => processPorts(item))
          )
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}
