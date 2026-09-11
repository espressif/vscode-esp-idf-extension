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

export function registerWelcomePanel(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.welcome.start", async () => {
    if (WelcomePanel.isCreatedAndHidden()) {
      WelcomePanel.createOrShow(context.extensionPath, undefined);
      return;
    }
    await withProgressWrapper(
      [],
      "ESP-IDF: Loading welcome page",
      async (progress, _cancelToken) => {
        const welcomeArgs = await getWelcomePageInitialValues(progress);
        WelcomePanel.createOrShow(context.extensionPath, welcomeArgs);
      }
    );
  });
}
