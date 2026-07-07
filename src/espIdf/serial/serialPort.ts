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

import { readParameter, writeParameter } from "../../configuration/idf";
import { Logger } from "../../common/logger";
import { spawn } from "../../utils";
import { SerialPortDetails } from "./serialPortDetails";
import { OutputChannel } from "../../common/outputChannel";
import * as SerialPortLib from "serialport";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import {
  esptoolNotAccessible,
  isKnownError,
  known,
  noSerialPort,
  noSerialPortsAvailable,
} from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { resolveEsptoolInvocation } from "../../flash/shared/esptool/resolveEsptoolInvocation";
import {
  ConfigurationTarget,
  ProgressLocation,
  QuickPickItem,
  Uri,
  l10n,
  window,
} from "vscode";

type SerialPortListItem = {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
};

type EsptoolInvocation = {
  pythonPath: string;
  esptoolScriptPath: string;
};

let listSerialPortsForTests: (() => Promise<SerialPortListItem[]>) | undefined;
let spawnForTests: typeof spawn | undefined;
let resolveEsptoolInvocationForTests:
  | ((idfPath: string) => Promise<EsptoolInvocation>)
  | undefined;
let getExpectedIdfTargetForTests:
  | ((workspaceFolder: Uri) => Promise<string>)
  | undefined;
let getCurrentIdfConfigurationForTests:
  | (() => Record<string, string>)
  | undefined;

/** @internal Test helper to stub serial port dependencies. */
export function setSerialPortModuleTestHooks(
  hooks:
    | {
        listSerialPorts?: typeof listSerialPortsForTests;
        spawn?: typeof spawnForTests;
        resolveEsptoolInvocation?: typeof resolveEsptoolInvocationForTests;
        getExpectedIdfTarget?: typeof getExpectedIdfTargetForTests;
        getCurrentIdfConfiguration?: typeof getCurrentIdfConfigurationForTests;
      }
    | undefined
): void {
  listSerialPortsForTests = hooks?.listSerialPorts;
  spawnForTests = hooks?.spawn;
  resolveEsptoolInvocationForTests = hooks?.resolveEsptoolInvocation;
  getExpectedIdfTargetForTests = hooks?.getExpectedIdfTarget;
  getCurrentIdfConfigurationForTests = hooks?.getCurrentIdfConfiguration;
}

function readIdfConfiguration(): Record<string, string> {
  if (getCurrentIdfConfigurationForTests) {
    return getCurrentIdfConfigurationForTests();
  }
  return getCurrentIdfConfiguration();
}

async function getExpectedIdfTarget(workspaceFolder: Uri): Promise<string> {
  if (getExpectedIdfTargetForTests) {
    return getExpectedIdfTargetForTests(workspaceFolder);
  }
  return (await getIdfTargetFromSdkconfig(workspaceFolder)) ?? "esp32";
}

async function resolveEsptool(idfPath: string): Promise<EsptoolInvocation> {
  if (resolveEsptoolInvocationForTests) {
    return resolveEsptoolInvocationForTests(idfPath);
  }
  return resolveEsptoolInvocation(idfPath);
}

async function runSpawn(
  ...args: Parameters<typeof spawn>
): ReturnType<typeof spawn> {
  if (spawnForTests) {
    return spawnForTests(...args);
  }
  return spawn(...args);
}

function isChipIdRequestEnabled(
  workspaceFolder: Uri,
  skipEsptoolCall: boolean
): boolean {
  if (skipEsptoolCall) {
    return false;
  }
  const setting = readParameter(
    "idf.enableSerialPortChipIdRequest",
    workspaceFolder
  );
  return setting !== false;
}

function getChipIdFromEsptoolOutput(output: string): string | undefined {
  const connectedMatch = output.match(/Connected to\s+([^\s]+)\s+on/);
  if (connectedMatch?.[1]) {
    return connectedMatch[1].trim();
  }
  const chipMatch = output.match(/Chip is(.*?)[\r]?\n/);
  if (chipMatch?.[1]) {
    return chipMatch[1].trim();
  }
  return undefined;
}

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
    workspaceFolder: Uri,
    useMonitorPort: boolean
  ) {
    return SerialPort.shared().displayList(workspaceFolder, useMonitorPort);
  }

  /**
   * Detect the default serial port using esptool.py
   * @param workspaceFolder The workspace folder
   * @returns The detected port
   * @throws {KnownError} When prerequisites are missing or no matching device is found
   */
  public static async detectDefaultPort(
    workspaceFolder: Uri
  ): Promise<string> {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: l10n.t("Detecting Espressif device serial port..."),
        cancellable: false,
      },
      async (progress) => {
        try {
          const modifiedEnv = readIdfConfiguration();
          const idfPath = modifiedEnv["IDF_PATH"];
          if (!idfPath) {
            throw esptoolNotAccessible();
          }
          const { pythonPath, esptoolScriptPath } =
            await resolveEsptool(idfPath);
          const expectedTarget = await getExpectedIdfTarget(workspaceFolder);

          OutputChannel.show();
          OutputChannel.appendLine(
            `Detecting default port using esptool.py...`
          );
          const timeout =
            (readParameter(
              "idf.serialPortDetectionTimeout",
              workspaceFolder
            ) as number) * 1000;

          const result = await runSpawn(
            pythonPath,
            [esptoolScriptPath, "--chip", expectedTarget, "chip_id"],
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

          for (const line of lines) {
            const portMatch = line.match(/Serial port\s+(\S+)/);
            if (portMatch) {
              portCount++;
            }
          }

          for (const line of lines) {
            const portMatch = line.match(/Serial port\s+(\S+)/);
            if (portMatch) {
              currentPort = portMatch[1];
              if (currentPort.endsWith(":")) {
                currentPort = currentPort.slice(0, -1);
              }
              testedPorts++;
              progress.report({
                message: l10n.t(
                  "Testing port {0} ({1}/{2})",
                  currentPort,
                  testedPorts,
                  portCount
                ),
                increment: portCount > 0 ? 100 / portCount : 0,
              });
              continue;
            }

            const chipMatch =
              line.match(/Connected to\s+([^\s]+)\s+on/) ||
              line.match(/Chip is\s+([^\s(]+)/);
            if (chipMatch && currentPort) {
              const chipType = chipMatch[1]
                .trim()
                .toLowerCase()
                .replace(/-/g, "");

              if (chipType === expectedTarget.toLowerCase()) {
                foundWorkingPort = this.convertMacOSPortName(currentPort);
                break;
              }
            }

            if (
              line.includes("failed to connect") ||
              line.includes("No serial data received")
            ) {
              currentPort = undefined;
            }
          }

          if (!foundWorkingPort) {
            progress.report({
              message: l10n.t(
                "No serial port found for current IDF_TARGET: {0}",
                expectedTarget
              ),
            });
            throw noSerialPort(expectedTarget);
          }

          return foundWorkingPort;
        } catch (error) {
          if (isKnownError(error)) {
            throw error;
          }
          Logger.error(
            "Failed to detect default serial port",
            error as Error,
            "serialPort detectDefaultPort"
          );
          const detail =
            error instanceof Error && error.message
              ? error.message
              : "Serial port detection failed.";
          throw known(ErrorCode.TaskFailedWithOutput, { detail });
        }
      }
    );
  }

  private async displayList(
    workspaceFolder: Uri,
    useMonitorPort: boolean
  ) {
    const msg = l10n.t(
      "Select the available serial port where your device is connected."
    );

    const portList: SerialPortDetails[] = await this.list(
      workspaceFolder,
      false
    );

    const portSetting2Use = useMonitorPort ? "idf.monitorPort" : "idf.port";
    const currentPort = readParameter(
      portSetting2Use,
      workspaceFolder
    ) as string;

    const detectOption = {
      description: l10n.t(
        "Auto-detect port (let esptool.py find the device automatically)"
      ),
      label: "detect",
      picked: false,
    };

    const portOptions = portList.map((l: SerialPortDetails) => {
      return {
        description: l.chipType || l.manufacturer || "",
        label: l.comName,
        picked: SerialPort.isSamePort(l.comName, currentPort),
      };
    });

    const allOptions = [detectOption, ...portOptions];

    const quickPick = window.createQuickPick<{
      description: string;
      label: string;
      picked: boolean;
    }>();
    quickPick.placeholder = msg;
    quickPick.items = allOptions;
    quickPick.activeItems = quickPick.items.filter((item) => item.picked);

    const chosen = await new Promise<QuickPickItem | undefined>((resolve) => {
      quickPick.onDidAccept(() => {
        resolve(quickPick.selectedItems[0]);
      });
      quickPick.onDidHide(() => {
        resolve(undefined);
      });
      quickPick.show();
    });

    quickPick.dispose();

    if (chosen && chosen.label) {
      if (chosen.label === "detect") {
        const detectedPort = await SerialPort.detectDefaultPort(
          workspaceFolder
        );
        await this.updatePortListStatus(
          detectedPort,
          workspaceFolder,
          useMonitorPort
        );
      } else {
        await this.updatePortListStatus(
          chosen.label,
          workspaceFolder,
          useMonitorPort
        );
      }
    }
  }

  public async getListArray(
    workspaceFolder: Uri,
    skipEsptoolCall: boolean = false
  ) {
    return await this.list(workspaceFolder, skipEsptoolCall);
  }

  public async updatePortListStatus(
    l: string,
    wsFolder: Uri,
    useMonitorPort: boolean
  ) {
    const portSetting2Use = useMonitorPort ? "idf.monitorPort" : "idf.port";
    const settingsSavedLocation = await writeParameter(
      portSetting2Use,
      l,
      ConfigurationTarget.WorkspaceFolder,
      wsFolder
    );
    const portHasBeenSelectedMsg = l10n.t("Port has been updated to ");
    Logger.infoNotify(
      `${portHasBeenSelectedMsg}${l} in ${settingsSavedLocation}`
    );
  }

  private async list(
    workspaceFolder: Uri,
    skipEsptoolCall: boolean
  ): Promise<SerialPortDetails[]> {
    const listOfSerialPorts = listSerialPortsForTests
      ? await listSerialPortsForTests()
      : await SerialPortLib.SerialPort.list();

    if (!listOfSerialPorts || listOfSerialPorts.length === 0) {
      throw noSerialPortsAvailable();
    }

    let choices = listOfSerialPorts.map((item) => {
      return new SerialPortDetails(
        item.path,
        item.manufacturer,
        item.vendorId,
        item.productId
      );
    });
    const enableSerialPortChipIdRequest = isChipIdRequestEnabled(
      workspaceFolder,
      skipEsptoolCall
    );
    const useSerialPortVendorProductFilter = readParameter(
      "idf.useSerialPortVendorProductFilter",
      workspaceFolder
    ) as boolean;
    const usbSerialPortFilters = readParameter(
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
      return choices;
    }

    const currentEnvVars = readIdfConfiguration();
    const idfPath = currentEnvVars["IDF_PATH"];
    if (!idfPath) {
      throw esptoolNotAccessible();
    }

    let pythonPath: string | undefined;
    let esptoolScriptPath: string | undefined;
    try {
      ({ pythonPath, esptoolScriptPath } = await resolveEsptool(idfPath));
    } catch (error) {
      if (
        !isKnownError(error) ||
        error.code !== ErrorCode.MISSING_DEPENDENCY ||
        error.metadata?.dependency !== "Python"
      ) {
        throw error;
      }
    }

    async function processPorts(serialPort: SerialPortDetails) {
      try {
        if (!pythonPath || !esptoolScriptPath) {
          serialPort.chipType = undefined;
          return serialPort;
        }
        const chipIdBuffer = await runSpawn(
          pythonPath,
          [esptoolScriptPath, "--port", serialPort.comName, "chip_id"],
          {
            timeout: 2000,
            silent: true,
            appendMode: "append",
            sendToTelemetry: false,
          }
        );
        serialPort.chipType = getChipIdFromEsptoolOutput(
          chipIdBuffer.toString()
        );
      } catch (e) {
        serialPort.chipType = undefined;
      }
      return serialPort;
    }

    return Promise.all(choices.map((item) => processPorts(item)));
  }
}
