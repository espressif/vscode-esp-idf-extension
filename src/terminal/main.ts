/*
 * Project: ESP-IDF VSCode Extension
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

import { Terminal, TerminalLocation, window, WorkspaceFolder } from "vscode";
import { loadTerminalLaunchConfig } from "./launchConfig";

function buildActivationCommand(activationScriptPath: string): string {
  const escapedPath = activationScriptPath.replace(/'/g, "''");
  if (process.platform === "win32") {
    return `& '${escapedPath}'`;
  }
  return `. '${escapedPath}'`;
}

/**
 * Creates and shows an ESP-IDF terminal for the workspace.
 *
 * @throws {KnownError} On validation failures. Callers that need a soft failure
 * should catch {@link isKnownError}.
 */
export async function createEspIdfTerminalMain(
  workspaceFolder: WorkspaceFolder,
  extensionPath: string,
  terminalName: string,
  initialCommand?: string,
  location?: TerminalLocation
): Promise<Terminal> {
  const config = await loadTerminalLaunchConfig(workspaceFolder, extensionPath);

  const espIdfTerminal = window.createTerminal({
    name: terminalName,
    env: config.env,
    cwd: config.cwd,
    strictEnv: true,
    shellArgs: config.shellArgs,
    shellPath: config.shellPath,
    location,
  });

  espIdfTerminal.sendText(
    buildActivationCommand(config.activationScriptPath)
  );

  if (initialCommand) {
    espIdfTerminal.sendText(initialCommand);
  }

  espIdfTerminal.show();
  return espIdfTerminal;
}
