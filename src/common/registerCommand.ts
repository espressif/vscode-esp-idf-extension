/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 30th March 2026 3:19:35 pm
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
import { commands, ExtensionContext } from "vscode";
import { Logger } from "../logger/logger";
import { Telemetry } from "../telemetry";

export function registerIDFCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
): number {
  const telemetryCallback = (...args: any[]): any => {
    const startTime = Date.now();
    Logger.info(`Command::${name}::Executed`);
    const cbResult = callback.apply(this, args);
    const timeSpent = Date.now() - startTime;
    Telemetry.sendEvent("command", { commandName: name }, { timeSpent });
    return cbResult;
  };
  return context.subscriptions.push(
    commands.registerCommand(name, telemetryCallback)
  );
}
