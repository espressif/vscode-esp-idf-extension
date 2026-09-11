/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 14th August 2026
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

import { debug, WorkspaceFolder } from "vscode";
import { Logger } from "../../common/logger";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { DevkitsCommand } from "../setTarget/DevkitsCommand";
import { OpenOCDManager } from "./openOcdManager";

export interface ConnectedBoard {
  name: string;
  description: string;
  target: string;
  location: string;
  config_files: string[];
  serial_number?: string;
}

export interface DetectConnectedBoardsResult {
  boards: ConnectedBoard[];
  openOCDVersion?: string;
}

export async function detectConnectedBoards(
  workspaceFolder: WorkspaceFolder,
  options?: { idfTarget?: string }
): Promise<DetectConnectedBoardsResult> {
  if (debug.activeDebugSession !== undefined) {
    Logger.info(
      "Connected ESP-IDF devkit detection is skipped while debugging. You can still select a target manually."
    );
    return { boards: [] };
  }

  try {
    const openOCDManager = OpenOCDManager.init();
    const openOCDVersion = await openOCDManager.version();
    const devkitsCmd = new DevkitsCommand(workspaceFolder);
    const modifiedEnv = getCurrentIdfConfiguration();
    const openOcdPath = await OpenOCDManager.getOpenOcdPath(
      workspaceFolder.uri,
      modifiedEnv
    );
    const scriptPath = await devkitsCmd.getScriptPath(openOcdPath);

    if (!scriptPath) {
      Logger.info(
        "Devkit detection script not available. A default list of targets will be displayed instead."
      );
      return { boards: [], openOCDVersion };
    }

    const devkitsOutput = await devkitsCmd.runDevkitsScript(openOCDVersion);
    if (!devkitsOutput) {
      return { boards: [], openOCDVersion };
    }

    const parsed = JSON.parse(devkitsOutput);
    if (!parsed || !Array.isArray(parsed.boards)) {
      return { boards: [], openOCDVersion };
    }

    const idfTarget = options?.idfTarget;
    const boards: ConnectedBoard[] = parsed.boards
      .filter((b: any) => !idfTarget || b.target === idfTarget)
      .map(
        (b: any): ConnectedBoard => ({
          name: b.name,
          description: b.description,
          target: b.target,
          location: b.location,
          config_files: b.config_files || [],
          serial_number: b.serial_number,
        })
      );

    return { boards, openOCDVersion };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    Logger.info(
      "No connected boards detected or error running DevkitsCommand: " + errMsg
    );
    return { boards: [] };
  }
}
