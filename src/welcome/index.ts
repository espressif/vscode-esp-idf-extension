/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 17th June 2026 2:29:31 pm
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

import { ExtensionContext } from "vscode";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { registerIDFCommand } from "../common/registerCommand";
import { getWelcomePageInitialValues } from "./welcomeInit";
import { WelcomePanel } from "./panel";
import { Logger } from "../common/logger";

export function registerWelcomePanel(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.welcome.start", async () => {
    if (WelcomePanel.isCreatedAndHidden()) {
      WelcomePanel.createOrShow(context.extensionPath, undefined);
      return;
    }
    await withProgressWrapper(
      [],
      "ESP-IDF: Loading welcome page",
      async (_progress, _cancelToken) => {
        try {
          const welcomeArgs = await getWelcomePageInitialValues(_progress);
          if (!welcomeArgs) {
            throw new Error("Error getting welcome page initial values");
          }
          WelcomePanel.createOrShow(context.extensionPath, welcomeArgs);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(errMsg, error as Error, "welcome panel");
        }
      }
    );
  });
}
