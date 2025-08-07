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
import { getVirtualEnvPythonPath } from "../../pythonManager";
import { getIdfTargetFromSdkconfig } from "../../workspaceConfig";
import { showInfoNotificationWithAction } from "../../logger/utils";

export class SerialPort {
  /**
   * Convert between TTY and CU port names on macOS
   * @param portName The port name to convert
   * @returns The converted port name (TTY to CU or CU to TTY)
   */
  private static convertMacOSPortName(portName: string): string {
    if (portName.startsWith("/dev/tty.")) {
      return portName.replace("/dev/tty.", "/dev/cu.");
    } else if (portName.startsWith("/dev/cu.")) {
      return portName.replace("/dev/cu.", "/dev/tty.");
    }
    return portName;
  }

  /**
   * Check if two port names refer to the same physical device
   * @param port1 First port name
   * @param port2 Second port name
   * @returns True if they refer to the same device
   */
  private static isSamePort(port1: string, port2: string): boolean {
    if (port1 === port2) return true;

    // Convert both to TTY format for comparison
    const tty1 = port1.startsWith("/dev/tty.")
      ? port1
      : this.convertMacOSPortName(port1);
    const tty2 = port2.startsWith("/dev/tty.")
      ? port2
      : this.convertMacOSPortName(port2);

    return tty1 === tty2;
  }

  public static shared(): SerialPort {
    if (!SerialPort.instance) {
      SerialPort.instance = new SerialPort();
    }
    return SerialPort.instance;
  }

  private static instance: SerialPort;
  public promptUserToSelect(
    workspaceFolder: vscode.Uri,
    useMonitorPort: boolean
  ) {
    return SerialPort.shared().displayList(workspaceFolder, useMonitorPort);
  }

  /**
   * Detect the default serial port using esptool.py
   * @param workspaceFolder The workspace folder
   * @returns The detected port or undefined if no device found
   */
  public static async detectDefaultPort(
    workspaceFolder: vscode.Uri
  ): Promise<string | undefined> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t("Detecting Espressif device serial port..."),
        cancellable: false,
      },
      async (progress) => {
        try {
          const idfPath = idfConf.readParameter(
            "idf.espIdfPath",
            workspaceFolder
          ) as string;
          const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
          const esptoolPath = join(
            idfPath,
            "components",
            "esptool_py",
            "esptool",
            "esptool.py"
          );

          const targetMatch = await getIdfTargetFromSdkconfig(workspaceFolder);
          const expectedTarget = targetMatch ? targetMatch : "esp32";

          OutputChannel.show();
          OutputChannel.appendLine(
            `Detecting default port using esptool.py...`
          );
          const result = await spawn(
            pythonBinPath,
            [esptoolPath, "--chip", expectedTarget, "chip_id"],
            {
              silent: false,
              appendMode: "append",
              timeout: 15000,
            }
          );

          const output = result.toString();
          const lines = output.split("\n");

          let currentPort: string | undefined;
          let foundWorkingPort: string | undefined;
          let portCount = 0;
          let testedPorts = 0;

          // Count total ports first
          for (const line of lines) {
            const portMatch = line.match(/Serial port\s+(\S+)/);
            if (portMatch) {
              portCount++;
            }
          }

          // Parse the output to find the working port
          for (const line of lines) {
            // Look for "Serial port" lines to track which port is being tested
            const portMatch = line.match(/Serial port\s+(\S+)/);
            if (portMatch) {
              currentPort = portMatch[1];
              testedPorts++;
              progress.report({
                message: vscode.l10n.t(
                  "Testing port {0} ({1}/{2})",
                  currentPort,
                  testedPorts,
                  portCount
                ),
                increment: portCount > 0 ? 100 / portCount : 0,
              });
              continue;
            }

            // Look for "Chip is" lines to identify successful connections
            const chipMatch = line.match(/Chip is\s+([^(]+)/);
            if (chipMatch && currentPort) {
              const chipType = chipMatch[1]
                .trim()
                .toLowerCase()
                .replace(/-/g, "");

              // Check if the chip type matches the expected target
              if (chipType === expectedTarget.toLowerCase()) {
                foundWorkingPort = this.convertMacOSPortName(currentPort);
                break;
              }
            }

            // If we see a failure message, reset currentPort
            if (
              line.includes("failed to connect") ||
              line.includes("No serial data received")
            ) {
              currentPort = undefined;
            }
          }

          if (!foundWorkingPort) {
            progress.report({
              message: vscode.l10n.t(
                "No serial port found for current IDF_TARGET: {0}",
                expectedTarget
              ),
            });
          }

          return foundWorkingPort;
        } catch (error) {
          Logger.error(
            "Failed to detect default serial port",
            error,
            "serialPort detectDefaultPort"
          );
          return undefined;
        }
      }
    );
  }

  private async displayList(
    workspaceFolder: vscode.Uri,
    useMonitorPort: boolean
  ) {
    const msg = vscode.l10n.t(
      "Select the available serial port where your device is connected."
    );

    try {
      let portList: SerialPortDetails[] = await this.list(workspaceFolder);

      // Get the currently selected port
      const portSetting2Use = useMonitorPort ? "idf.monitorPort" : "idf.port";
      const currentPort = idfConf.readParameter(
        portSetting2Use,
        workspaceFolder
      ) as string;

      // Add the "detect" option at the beginning of the list
      const detectOption = {
        description: vscode.l10n.t(
          "Auto-detect port (let esptool.py find the device automatically)"
        ),
        label: "detect",
        picked: false,
      };

      const portOptions = portList.map((l: SerialPortDetails) => {
        return {
          description: l.chipType || l.manufacturer,
          label: l.comName,
          picked: SerialPort.isSamePort(l.comName, currentPort),
        };
      });

      const allOptions = [detectOption, ...portOptions];

      // Create QuickPick and show currently selected port
      const quickPick = vscode.window.createQuickPick<{
        description: string;
        label: string;
        picked: boolean;
      }>();
      quickPick.placeholder = msg;
      quickPick.items = allOptions;
      quickPick.activeItems = quickPick.items.filter((item) => item.picked);

      const chosen = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
          quickPick.onDidAccept(() => {
            resolve(quickPick.selectedItems[0]);
          });
          quickPick.onDidHide(() => {
            resolve(undefined);
          });
          quickPick.show();
        }
      );

      quickPick.dispose();

      if (chosen && chosen.label) {
        if (chosen.label === "detect") {
          const detectedPort = await SerialPort.detectDefaultPort(
            workspaceFolder
          );
          if (detectedPort) {
            await this.updatePortListStatus(
              detectedPort,
              workspaceFolder,
              useMonitorPort
            );
          } else {
            const targetMatch = await getIdfTargetFromSdkconfig(
              workspaceFolder
            );
            const currentTarget = targetMatch ? targetMatch : "esp32";
            const noPortFoundMsg = vscode.l10n.t(
              "No serial port found for current IDF_TARGET: {0}",
              currentTarget
            );
            await showInfoNotificationWithAction(
              noPortFoundMsg,
              vscode.l10n.t("Detect"),
              () => vscode.commands.executeCommand("espIdf.detectSerialPort")
            );
          }
        } else {
          await this.updatePortListStatus(
            chosen.label,
            workspaceFolder,
            useMonitorPort
          );
        }
      }
    } catch (error) {
      const msg = error.message
        ? error.message
        : "Something went wrong while getting the serial port list";
      Logger.errorNotify(msg, error, "SerialPort displayList");
      OutputChannel.appendLine(msg, "Serial port");
      OutputChannel.appendLineAndShow(JSON.stringify(error));
    }
  }

  public async getListArray(workspaceFolder: vscode.Uri) {
    return await this.list(workspaceFolder);
  }

  private async updatePortListStatus(
    l: string,
    wsFolder: vscode.Uri,
    useMonitorPort: boolean
  ) {
    const portSetting2Use = useMonitorPort ? "idf.monitorPort" : "idf.port";
    const settingsSavedLocation = await idfConf.writeParameter(
      portSetting2Use,
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

        const pythonBinPath = await getVirtualEnvPythonPath(workspaceFolder);
        const idfPath = idfConf.readParameter(
          "idf.espIdfPath",
          workspaceFolder
        );
        const enableSerialPortChipIdRequest = idfConf.readParameter(
          "idf.enableSerialPortChipIdRequest",
          workspaceFolder
        ) as boolean;
        const useSerialPortVendorProductFilter = idfConf.readParameter(
          "idf.useSerialPortVendorProductFilter",
          workspaceFolder
        ) as boolean;
        const usbSerialPortFilters = idfConf.readParameter(
          "idf.usbSerialPortFilters",
          workspaceFolder
        ) as { [key: string]: { vendorId: string; productId: string } };
        if (useSerialPortVendorProductFilter) {
          const filterDictKeys = new Set<string>(
            Object.keys(usbSerialPortFilters).map((key) => {
              const { vendorId, productId } = usbSerialPortFilters[key];
              return `${vendorId ? vendorId.toLowerCase() : undefined}-${
                productId ? productId.toLowerCase() : undefined
              }`;
            })
          );
          choices = choices.filter(({ vendorId, productId }) => {
            const key = `0x${vendorId ? vendorId.toLowerCase() : undefined}-0x${
              productId ? productId.toLowerCase() : undefined
            }`;
            return filterDictKeys.has(key);
          });
        }

        if (!enableSerialPortChipIdRequest) {
          return resolve(choices);
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
              { timeout: 2000, silent: true, appendMode: "append" }
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

        resolve(await Promise.all(choices.map((item) => processPorts(item))));
      } catch (error) {
        reject(error);
      }
    });
  }
}
