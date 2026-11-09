/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 25th September 2026 12:00:00 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
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

import { ConfigurationTarget, Uri, workspace, WorkspaceFolder } from "vscode";
import { Logger } from "../../common/logger";
import { readSettingsParameter, writeParameter } from "../../configuration/idf";
import { updateCurrentProfileCustomExtraVars } from "../../project-conf";
import { updateOpenOcdAdapterStatusBarItem } from "../../statusBar";
import {
  detectConnectedBoards,
  DetectConnectedBoardsOptions,
  DetectConnectedBoardsResult,
} from "./detectConnectedBoards";

export interface AdapterBinding {
  serial?: string;
  location?: string;
}

export interface ResolvedAdapterBinding extends AdapterBinding {
  stale: boolean;
}

export interface ResolveAdapterBindingOptions {
  openOCDVersion?: string;
}

interface AdapterBindingTestHooks {
  detectConnectedBoards?: (
    workspaceFolder: WorkspaceFolder,
    options: DetectConnectedBoardsOptions
  ) => Promise<DetectConnectedBoardsResult>;
}

let testHooks: AdapterBindingTestHooks | undefined;

export function setAdapterBindingTestHooks(
  hooks?: AdapterBindingTestHooks
): void {
  testHooks = hooks;
}

function normalizeLocation(location?: string): string | undefined {
  return location ? location.replace(/^usb:\/\//, "") : undefined;
}

export async function storeAdapterLocation(
  workspaceFolder: WorkspaceFolder,
  location: string
): Promise<void> {
  const settingsExtraVars = (readSettingsParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) || {}) as { [key: string]: string };
  await writeParameter(
    "idf.customExtraVars",
    { ...settingsExtraVars, OPENOCD_USB_ADAPTER_LOCATION: location },
    ConfigurationTarget.WorkspaceFolder,
    workspaceFolder
  );
  await updateCurrentProfileCustomExtraVars(
    { OPENOCD_USB_ADAPTER_LOCATION: location },
    workspaceFolder.uri
  );
  updateOpenOcdAdapterStatusBarItem(workspaceFolder.uri);
}

export async function resolveAdapterBindingForLaunch(
  workspaceUri: Uri,
  stored: AdapterBinding,
  options?: ResolveAdapterBindingOptions
): Promise<ResolvedAdapterBinding> {
  const unchanged: ResolvedAdapterBinding = { ...stored, stale: false };
  if (!stored.serial) {
    return unchanged;
  }
  const workspaceFolder = workspace.getWorkspaceFolder(workspaceUri);
  if (!workspaceFolder) {
    return unchanged;
  }

  const detect = testHooks?.detectConnectedBoards ?? detectConnectedBoards;
  const { boards, skipped } = await detect(workspaceFolder, {
    silent: true,
    allowWhileDebugging: true,
    openOCDVersion: options?.openOCDVersion,
  });
  if (skipped || boards.length === 0) {
    return unchanged;
  }

  const storedSerial = stored.serial.toUpperCase();
  const pinnedBoard = boards.find(
    (b) => b.serial_number && b.serial_number.toUpperCase() === storedSerial
  );
  if (pinnedBoard) {
    const detectedLocation = normalizeLocation(pinnedBoard.location);
    if (
      detectedLocation &&
      detectedLocation !== normalizeLocation(stored.location)
    ) {
      Logger.info(
        `OpenOCD adapter ${stored.serial} is now at USB location ${detectedLocation}. Replacing the stored location ${stored.location}.`
      );
    }
    return { ...unchanged, location: detectedLocation ?? stored.location };
  }

  const storedLocation = normalizeLocation(stored.location);
  const locationConnected =
    !!storedLocation &&
    boards.some((b) => normalizeLocation(b.location) === storedLocation);

  Logger.info(
    `Stored OpenOCD adapter serial ${stored.serial} does not match any connected board. Launching OpenOCD without it.`
  );
  return {
    serial: undefined,
    location: locationConnected ? stored.location : undefined,
    stale: true,
  };
}
