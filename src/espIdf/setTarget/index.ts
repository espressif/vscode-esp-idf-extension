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
  WorkspaceFolder,
  window,
  l10n,
  QuickPickItemKind,
  debug,
} from "vscode";
import {
  NotificationMode,
  readParameter,
  writeParameter,
} from "../../idfConfiguration";
import { Logger } from "../../logger/logger";
import { OutputChannel } from "../../logger/outputChannel";
import { selectOpenOcdConfigFiles } from "../openOcd/boardConfiguration";
import { OpenOCDManager } from "../openOcd/openOcdManager";
import { getTargetsFromEspIdf, IdfTarget } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";
import { updateCurrentProfileIdfTarget } from "../../project-conf";
import { DevkitsCommand } from "./DevkitsCommand";
import {
  clearAdapterSerial,
  getStoredAdapterSerial,
} from "../openOcd/adapterSerial";
import { SerialPort } from "../serial/serialPort";

export let isSettingIDFTarget = false;

export interface ISetTargetQuickPickItems {
  label: string;
  idfTarget?: IdfTarget;
  boardInfo?: {
    location: string;
    config_files: string[];
  };
  description?: string;
  isConnected?: boolean;
  kind?: QuickPickItemKind;
}

export function setIsSettingIDFTarget(value: boolean) {
  isSettingIDFTarget = value;
}

export async function setIdfTarget(
  placeHolderMsg: string,
  workspaceFolder: WorkspaceFolder
) {
  const configurationTarget = ConfigurationTarget.WorkspaceFolder;
  if (!workspaceFolder) {
    return;
  }
  if (isSettingIDFTarget) {
    Logger.info("setTargetInIDF is already running.");
    return;
  }
  setIsSettingIDFTarget(true);

  const notificationMode = readParameter(
    "idf.notificationMode",
    workspaceFolder
  ) as string;
  const progressLocation =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Notifications
      ? ProgressLocation.Notification
      : ProgressLocation.Window;
  await window.withProgress(
    {
      cancellable: false,
      location: progressLocation,
      title: "ESP-IDF: Setting device target...",
    },
    async (progress: Progress<{ message: string; increment: number }>) => {
      try {
        const targetsFromIdf = await getTargetsFromEspIdf(workspaceFolder.uri);
        let connectedBoards: ISetTargetQuickPickItems[] = [];

        const isDebugging = debug.activeDebugSession !== undefined;

        if (!isDebugging) {
          try {
            const openOCDManager = OpenOCDManager.init();
            const openOCDVersion = await openOCDManager.version();
            const devkitsCmd = new DevkitsCommand(workspaceFolder.uri);
            const scriptPath = await devkitsCmd.getScriptPath(openOCDVersion);

            if (scriptPath) {
              const devkitsOutput = await devkitsCmd.runDevkitsScript(openOCDVersion);
              if (devkitsOutput) {
                const parsed = JSON.parse(devkitsOutput);
                if (parsed && Array.isArray(parsed.boards)) {
                  connectedBoards = parsed.boards.map(
                    (b: any) =>
                      ({
                        label: b.name,
                        idfTarget: targetsFromIdf.find(
                          (t) => t.target === b.target
                        ),
                        description: b.description,
                        detail: `Status: CONNECTED${
                          b.location ? `   Location: ${b.location}` : ""
                        }`,
                        isConnected: true,
                        boardInfo: b,
                      } as ISetTargetQuickPickItems)
                  );
                }
              }
            } else {
              Logger.info(
                "Devkit detection script not available. A default list of targets will be displayed instead."
              );
            }
          } catch (e) {
            Logger.info(
              "No connected boards detected or error running DevkitsCommand: " +
                (e && e.message ? e.message : e)
            );
          }
        } else {
          Logger.info(
            "Connected ESP-IDF devkit detection is skipped while debugging. You can still select a target manually."
          );
        }
        let quickPickItems: ISetTargetQuickPickItems[] = [];
        const defaultBoards: ISetTargetQuickPickItems[] = targetsFromIdf.map(
          (t) => ({
            label: t.label,
            idfTarget: t,
            description: t.isPreview ? "Preview target" : undefined,
            isConnected: false,
          })
        );

        quickPickItems =
          connectedBoards.length > 0
            ? [
                ...connectedBoards,
                { kind: QuickPickItemKind.Separator, label: "Default Boards" },
                ...defaultBoards,
              ]
            : defaultBoards;
        const selectedTarget = await window.showQuickPick(quickPickItems, {
          placeHolder: placeHolderMsg,
        });
        if (!selectedTarget) {
          return;
        }
        // Create a plain object copy to avoid proxy issues when modifying/deleting properties
        const customExtraVarsRead = readParameter(
          "idf.customExtraVars",
          workspaceFolder
        ) as { [key: string]: string };
        const customExtraVars = { ...customExtraVarsRead };

        // Clear stored adapter serial and location when target changes
        clearAdapterSerial(workspaceFolder.uri);
        delete customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];

        if (selectedTarget.isConnected && selectedTarget.boardInfo) {
          // Directly set OpenOCD configs for connected board
          const configFiles = selectedTarget.boardInfo.config_files || [];
          await writeParameter(
            "idf.openOcdConfigs",
            configFiles,
            configurationTarget,
            workspaceFolder.uri
          );
          // Store USB location if available (will be used as fallback if serial is not found)
          let usbLocation: string | undefined;
          if (selectedTarget.boardInfo.location) {
            usbLocation = selectedTarget.boardInfo.location.replace(
              "usb://",
              ""
            );
            customExtraVars["OPENOCD_USB_ADAPTER_LOCATION"] = usbLocation;
          }
          
          // Update serial port if board is connected
          // The serial port should match the connected board
          // Note: USB location matching is unreliable (bus-port format doesn't map to Windows locationId),
          // so we try location-based lookup first, then fall back to detectDefaultPort which tests each port to find the correct device
          try {
            let detectedPort: string | undefined;
            
            // Try location-based lookup first (fast path, but may not work on all platforms)
            if (usbLocation) {
              detectedPort = await SerialPort.findPortByUsbLocation(usbLocation);
            }
            
            // Fall back to detectDefaultPort
            // It tests each port with esptool.py to find the correct ESP device
            // Might give wrong solution if two same device target are connected, it will pick the first one
            if (!detectedPort) {
              detectedPort = await SerialPort.detectDefaultPort(
                workspaceFolder.uri
              );
            }
            
            if (detectedPort) {
              await SerialPort.shared().updatePortListStatus(
                detectedPort,
                workspaceFolder.uri,
                false // useMonitorPort = false, update idf.port
              );
            }
          } catch (error) {
            Logger.info(
              `Failed to detect serial port for connected board: ${error.message}`,
              "setIdfTarget"
            );
          }
        } else {
          await selectOpenOcdConfigFiles(
            workspaceFolder.uri,
            selectedTarget.idfTarget.target
          );
        }

        await setTargetInIDF(workspaceFolder, selectedTarget.idfTarget);
        customExtraVars["IDF_TARGET"] = selectedTarget.idfTarget.target;
        await writeParameter(
          "idf.customExtraVars",
          customExtraVars,
          configurationTarget,
          workspaceFolder.uri
        );
        await updateCurrentProfileIdfTarget(
          selectedTarget.idfTarget.target,
          workspaceFolder.uri
        );
      } catch (err) {
        const errMsg =
          err instanceof Error
            ? err.message
            : l10n.t("Unknown error occurred while setting IDF target.");

        if (errMsg.includes("are satisfied")) {
          Logger.info(errMsg);
          OutputChannel.appendLine(errMsg);
        } else {
          Logger.errorNotify(errMsg, err, "setIdfTarget");
          OutputChannel.appendLine(errMsg);
        }
      } finally {
        setIsSettingIDFTarget(false);
      }
    }
  );
}
