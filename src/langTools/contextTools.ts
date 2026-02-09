/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Context Query Tools for AI Agents
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import * as SerialPortLib from "serialport";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { Logger } from "../logger/logger";

/**
 * ESP-IDF Context Tools for AI Agents
 *
 * These tools allow AI agents to QUERY project state before executing commands.
 * This enables agents to make informed decisions and avoid blind execution failures.
 *
 */

/**
 * Extract ESP vendor IDs from idf.usbSerialPortFilters configuration.
 * This ensures we use the same source of truth as the rest of the extension.
 */
function getEspVendorIds(workspaceURI: vscode.Uri): Set<string> {
  const vendorIds = new Set<string>();
  
  // Extract vendor IDs from user configuration
  const usbSerialPortFilters = readParameter(
    "idf.usbSerialPortFilters",
    workspaceURI
  ) as { [key: string]: { vendorId: string; productId: string } } | undefined;
  
  if (usbSerialPortFilters) {
    Object.values(usbSerialPortFilters).forEach((filter) => {
      if (filter.vendorId) {
        // Remove "0x" prefix and convert to lowercase
        const vendorId = filter.vendorId.toLowerCase().replace(/^0x/, "");
        if (vendorId) {
          vendorIds.add(vendorId);
        }
      }
    });
  }
  
  return vendorIds;
}

let portInfoDisposable: vscode.Disposable | undefined;

export function activateContextTools(context: vscode.ExtensionContext) {
  portInfoDisposable = vscode.lm.registerTool("espIdfPortInfo", {
    async invoke(
      options: { input: {} },
      token: vscode.CancellationToken
    ) {
      try {
        const defaultWorkspace = vscode.workspace.workspaceFolders?.[0];
        const workspaceURI = ESP.GlobalConfiguration.store.get<vscode.Uri>(
          ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER,
          defaultWorkspace?.uri
        );

        if (!workspaceURI) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              JSON.stringify({
                error: "No ESP-IDF workspace found. Please open an ESP-IDF project folder first."
              })
            ),
          ]);
        }

        const configuredPort = readParameter("idf.port", workspaceURI) as string;
        const currentTarget = await getIdfTargetFromSdkconfig(workspaceURI);
        const espVendorIds = getEspVendorIds(workspaceURI);

        let availablePorts: Array<{
          path: string;
          manufacturer?: string;
          vendorId?: string;
          productId?: string;
          isEspDevice: boolean;
        }> = [];

        try {
          const ports = await SerialPortLib.SerialPort.list();
          availablePorts = ports.map((port) => {
            const vendorIdLower = port.vendorId?.toLowerCase();
            const isEspDevice = vendorIdLower ? espVendorIds.has(vendorIdLower) : false;
            return {
              path: port.path,
              manufacturer: port.manufacturer,
              vendorId: port.vendorId,
              productId: port.productId,
              isEspDevice,
            };
          });
        } catch (listError) {
          // If listing fails, continue with empty list
          Logger.warn(`Failed to list serial ports: ${listError.message}`);
        }

        const configuredPortInfo = availablePorts.find(
          (p) => p.path === configuredPort ||
                 p.path.includes(configuredPort) ||
                 configuredPort.includes(p.path)
        );

        const configuredPortExists = !!configuredPortInfo;
        const configuredPortIsEspDevice = configuredPortInfo?.isEspDevice ?? false;
        const espDevices = availablePorts.filter((p) => p.isEspDevice);

        let recommendation: string;
        if (configuredPort === "detect") {
          if (espDevices.length > 0) {
            recommendation = `Port set to auto-detect. Found ${espDevices.length} ESP device(s): ${espDevices.map(d => d.path).join(", ")}`;
          } else {
            recommendation = "Port set to auto-detect but no ESP devices found. Please connect an ESP device.";
          }
        } else if (!configuredPortExists) {
          if (espDevices.length > 0) {
            recommendation = `Configured port "${configuredPort}" not found. Consider using one of the detected ESP devices: ${espDevices.map(d => d.path).join(", ")}`;
          } else {
            recommendation = `Configured port "${configuredPort}" not found and no ESP devices detected. Please connect an ESP device.`;
          }
        } else if (!configuredPortIsEspDevice) {
          if (espDevices.length > 0) {
            recommendation = `Warning: Configured port "${configuredPort}" does not appear to be an ESP device. Consider using: ${espDevices.map(d => d.path).join(", ")}`;
          } else {
            recommendation = `Warning: Configured port "${configuredPort}" does not appear to be an ESP device. No other ESP devices detected.`;
          }
        } else {
          recommendation = `Ready to flash. Port "${configuredPort}" is configured and appears to be a valid ESP device.`;
        }

        const result = {
          configuredPort,
          portSetting: "idf.port",
          currentTarget: currentTarget || "unknown",
          availablePorts,
          espDevicesFound: espDevices.length,
          configuredPortExists,
          configuredPortIsEspDevice,
          recommendation,
        };

        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
        ]);
      } catch (error) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            JSON.stringify({
              error: `Failed to get port information: ${error.message}`,
            })
          ),
        ]);
      }
    },
  });
  context.subscriptions.push(portInfoDisposable);
}

export function deactivateContextTools() {
  if (portInfoDisposable) {
    portInfoDisposable.dispose();
    portInfoDisposable = undefined;
  }
}
