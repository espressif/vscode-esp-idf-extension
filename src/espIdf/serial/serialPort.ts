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

import { join, sep, basename } from "path";
import * as fs from "fs-extra"
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
   * Parse OpenOCD USB string like:
   *   "1-6"
   *   "3-1.1"
   *
   * Returns:
   *   { bus: 1, ports: [6] }
   *   { bus: 3, ports: [1,1] }
   */
  private static parseBusPortFormat(
    usbLocation: string
  ): { bus: number; ports: number[] } | undefined {
    const match = usbLocation.match(/^(\d+)-([\d.]+)$/);
    if (!match) {
      return undefined;
    }

    const bus = parseInt(match[1], 10);
    const ports = match[2].split(".").map((p) => parseInt(p, 10));

    if (ports.some(isNaN)) {
      return undefined;
    }

    return { bus, ports };
  }

  /**
   * Parse Windows locationId into USB port chain.
   *
   * Windows format example:
   *   "000d.0000.0000.006.000.000.000.000.000"
   *   "0011.0000.0000.001.001.000.000.000.000"
   *
   * Returns:
   *   { ports: [6] }          → for ESP32-H2 (port 6)
   *   { ports: [1,1] }        → for ESP32-C5 (hub port 1 → port 1)
   *
   * NOTE: Windows does NOT expose the USB bus number, so we cannot return "bus".
   */
  private static parseWindowsLocationId(
    locationId: string
  ): { ports: number[] } | undefined {
    if (!locationId) {
      return undefined;
    }

    const parts = locationId.split(".");
    if (parts.length < 4) {
      return undefined;
    }

    // Convert to decimal ints
    const nums = parts.map((p) => parseInt(p, 16));

    // Remove trailing zeros (unused hub levels)
    while (nums.length > 0 && nums[nums.length - 1] === 0) {
      nums.pop();
    }

    // Starting from index 3, extract all non-zero USB port levels
    const usbParts = nums.slice(3).filter((n) => n > 0);

    if (usbParts.length === 0) {
      return undefined;
    }

    return { ports: usbParts };
  }

  /**
   * Extract bus and port from macOS locationId format
   * macOS locationId format: "01100000", "00100000" (hexadecimal)
   * 
   * Based on observed data and macOS IOKit documentation:
   * - "01100000" (0x01100000) → bus 1, port 1
   * - "00100000" (0x00100000) → bus 0, port 1
   * 
   * macOS IOKit locationID encoding:
   * The locationID is a 32-bit integer that encodes USB topology information.
   * 
   * Port encoding:
   * - Port numbers are encoded in bits 20-23 (upper 4 bits of byte 2)
   * - Formula: port = (locationNum >> 20) & 0xF
   * - This supports ports 1-15 (4-bit range)
   * - For higher port numbers, the encoding may use additional bits
   * 
   * Bus encoding:
   * - Bus number is encoded directly in byte 3 (bits 24-31)
   * - Formula: bus = (locationNum >> 24) & 0xFF
   * - Examples:
   *   * "01100000": upperByte = 0x01 = 1 → bus 1
   *   * "00100000": upperByte = 0x00 = 0 → bus 0
   * 
   * @param locationId The macOS locationId string (hexadecimal)
   * @returns Object with bus and port numbers, or undefined if format doesn't match
   */
  private static parseMacOSLocationId(locationId: string): { bus: number; port: number } | undefined {
    if (!locationId) {
      return undefined;
    }

    const locationNum = parseInt(locationId, 16);
    if (isNaN(locationNum) || locationNum === 0) {
      return undefined;
    }

    // Extract port from bits 20-23 (upper 4 bits of byte 2)
    // This supports ports 1-15
    const port = (locationNum >> 20) & 0xF;
    
    // Extract bus from byte 3 (bits 24-31)
    // Bus encoding is direct: upperByte value = bus number
    // Examples:
    // - "01100000" (0x01100000): upperByte = 0x01 = 1 → bus 1
    // - "00100000" (0x00100000): upperByte = 0x00 = 0 → bus 0
    const bus = (locationNum >> 24) & 0xFF;
    
    // Validate extracted values
    if (port > 0 && port <= 15 && bus >= 0 && bus <= 255) {
      return { bus, port };
    }
    
    // If validation failed, return undefined
    // This handles cases where the encoding doesn't match expected patterns
    return undefined;
  }

    /**
   * Parse Linux sysfs path to extract bus and port chain.
   *
   * Given tty device path like:
   *   /sys/class/tty/ttyACM0/device → ../../usb3/3-3/3-3:1.0
   *
   * We extract "3-3" = bus 3, port 3
   *
   * Supports hub chains too: 3-1.2.3
   */
  private static parseLinuxSysfsUsbPath(ttyPath: string): { bus: number; ports: number[] } | undefined {

    try {
      // Resolve symlink: /sys/class/tty/ttyACM0/device
      const sysDevicePath = fs.realpathSync(ttyPath);

      // Look for any segment matching Linux USB address format: "3-3", "3-1.2", etc
      const segments = sysDevicePath.split(sep);

      for (const seg of segments) {
        const m = seg.match(/^(\d+)-([\d.]+)$/);
        if (m) {
          const bus = parseInt(m[1], 10);
          const ports = m[2].split(".").map((p) => parseInt(p, 10));
          return { bus, ports };
        }
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  /**
   * Find serial port by USB location identifier
   * Note: The bus-port format from OpenOCD (e.g., "1-6") doesn't reliably map to
   * Windows locationId format, so this function primarily serves as a fallback.
   * For connected boards, detectDefaultPort() is more reliable.
   * @param usbLocation The USB location identifier (bus-port format like "1-6", locationId on Windows/macOS, pnpId on Linux)
   * @returns The matching port path or undefined if not found
   */
  public static async findPortByUsbLocation(
    usbLocation: string
  ): Promise<string | undefined> {
    try {
      const listOfSerialPorts = await SerialPortLib.SerialPort.list();

      if (!listOfSerialPorts || listOfSerialPorts.length === 0) {
        return undefined;
      }

      const isWindows = process.platform === "win32";
      const isMacOS = process.platform === "darwin";
      const isLinux = process.platform === "linux";

      // Try to parse as bus-port format and match
      const busPort = this.parseBusPortFormat(usbLocation);
      if (busPort) {
        for (const port of listOfSerialPorts) {
          if (isWindows && port.locationId) {
            const winPorts = this.parseWindowsLocationId(port.locationId);
            if (winPorts) {
              // Example:
              // OpenOCD: ports = [1,1]
              // Windows: ports = [1,1]
              if (JSON.stringify(winPorts.ports) === JSON.stringify(busPort.ports)) {
                return port.path;
              }
            }
          // macOS USB Matching Logic
          //
          // On macOS, SerialPort.list() provides locationId in hexadecimal format (e.g., "01100000").
          // The locationId encodes USB bus and port information:
          // - Port: encoded in bits 20-23 (supports ports 1-15)
          // - Bus: encoded directly in bits 24-31 (byte 3)
          //
          // Examples:
          //   "01100000" (0x01100000) → bus 1, port 1
          //   "00100000" (0x00100000) → bus 0, port 1
          //
          // OpenOCD reports locations in bus-port format: "usb://0-1" → bus 0, port 1
          //
          // Therefore, matching an OpenOCD device to a macOS serial port means:
          //   1. Parse the macOS locationId to extract bus and port
          //   2. Compare with OpenOCD bus-port format
          //   3. If both match, this serial port belongs to that USB device
          } else if (isMacOS && port.locationId) {
            const locationBusPort = this.parseMacOSLocationId(port.locationId);
            if (
              locationBusPort &&
              locationBusPort.bus === busPort.bus &&
              locationBusPort.port === busPort.ports[0]
            ) {
              return this.convertMacOSPortName(port.path);
            }
          // Linux USB Matching Logic
          //
          // On Linux, SerialPort.list() does NOT provide USB topology (no locationId),
          // but every /dev/ttyACM* or /dev/ttyUSB* device is represented in sysfs:
          //
          //   /sys/class/tty/<tty>/device → realpath → .../usb<bus>/<bus>-<port-chain>/...
          //
          // Example realpath:
          //   /sys/devices/pci0000:00/.../usb3/3-2/3-2:1.0
          //
          // The key part is the directory segment:  "3-2"
          //   → "3" = USB bus number
          //   → "2" = physical port number
          // Multi-hop hubs look like "3-1.4.2" → ports = [1,4,2]
          //
          // OpenOCD also reports locations in exactly this format: "usb://3-2"
          //
          // Therefore, matching an OpenOCD device to a Linux serial port means:
          //   1. Resolve /sys/class/tty/<port>/device real symlink
          //   2. Extract the first segment matching pattern  <bus>-<port(.subport...)>
          //   3. Compare bus + ports[] with OpenOCD value
          //
          // If both match, this serial port belongs to that USB device.
          } else if (isLinux && port.pnpId) {
            const sysPath = `/sys/class/tty/${basename(port.path)}/device`;
            const linuxInfo = this.parseLinuxSysfsUsbPath(sysPath);

            if (linuxInfo &&
                linuxInfo.bus === busPort.bus &&
                JSON.stringify(linuxInfo.ports) === JSON.stringify(busPort.ports)) {
              return port.path;
            }
          }
        }
      }

      return undefined;
    } catch (error) {
      Logger.error(
        "Failed to find serial port by USB location",
        error,
        "serialPort findPortByUsbLocation"
      );
      return undefined;
    }
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
          const timeout =
            (idfConf.readParameter(
              "idf.serialPortDetectionTimeout",
              workspaceFolder
            ) as number) * 1000; // Convert seconds to milliseconds

          const result = await spawn(
            pythonBinPath,
            [esptoolPath, "--chip", expectedTarget, "chip_id"],
            {
              silent: false,
              appendMode: "append",
              timeout: timeout,
              sendToTelemetry: false,
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
      const sendToTelemetry = msg.indexOf("No serial ports found") === -1;
      Logger.errorNotify(
        msg,
        error,
        "SerialPort displayList",
        undefined,
        sendToTelemetry
      );
      OutputChannel.appendLine(msg, "Serial port");
      OutputChannel.appendLineAndShow(JSON.stringify(error));
    }
  }

  public async getListArray(workspaceFolder: vscode.Uri) {
    return await this.list(workspaceFolder);
  }

  public async updatePortListStatus(
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
              {
                timeout: 2000,
                silent: true,
                appendMode: "append",
                sendToTelemetry: false,
              }
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
