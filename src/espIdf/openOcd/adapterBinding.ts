/*
 * Project: ESP-IDF VSCode Extension
 * File Created: 12.02.2025
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

import { Uri, workspace, WorkspaceFolder } from "vscode";
import { Logger } from "../../common/logger";
import {
  detectConnectedBoards,
  DetectConnectedBoardsResult,
} from "./detectConnectedBoards";

export interface AdapterBinding {
  serial?: string;
  location?: string;
}

export interface ResolvedAdapterBinding extends AdapterBinding {
  stale: boolean;
}

interface AdapterBindingTestHooks {
  detectConnectedBoards?: (
    workspaceFolder: WorkspaceFolder
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

export async function resolveAdapterBindingForLaunch(
  workspaceUri: Uri,
  stored: AdapterBinding
): Promise<ResolvedAdapterBinding> {
  const unchanged: ResolvedAdapterBinding = { ...stored, stale: false };
  if (!stored.serial) {
    return unchanged;
  }
  const workspaceFolder = workspace.getWorkspaceFolder(workspaceUri);
  if (!workspaceFolder) {
    return unchanged;
  }

  const detect = testHooks?.detectConnectedBoards
    ? testHooks.detectConnectedBoards
    : (folder: WorkspaceFolder) =>
        detectConnectedBoards(folder, { silent: true });
  const { boards } = await detect(workspaceFolder);
  if (boards.length === 0) {
    return unchanged;
  }

  const storedSerial = stored.serial.toUpperCase();
  const serialConnected = boards.some(
    (b) => b.serial_number && b.serial_number.toUpperCase() === storedSerial
  );
  if (serialConnected) {
    return unchanged;
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
