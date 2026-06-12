/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th June 2026 12:49:50 pm
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

import { ExtensionContext, l10n } from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { readParameter } from "../../configuration/idf";
import { getCurrentIdfConfiguration } from "../../configuration/env";
import { ArduinoComponentInstaller } from "./addArduinoComponent";
import { join } from "path";
import { dirExistPromise } from "../../utils";
import { Logger } from "../../common/logger";
import { openFolderCheck } from "../../common/PreCheck";

export function registerAddArduinoAsComponentCmd(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.addArduinoAsComponentToCurFolder",
    async () => {
      await withProgressWrapper(
        [openFolderCheck],
        l10n.t("ESP-IDF: Arduino ESP32 as ESP-IDF component"),
        async (_progress, cancelToken, wsFolder) => {
          try {
            const gitPath =
              (readParameter("idf.gitPath", wsFolder) as string) || "git";
            const currentEnvVars = getCurrentIdfConfiguration();
            let idfPath = currentEnvVars["IDF_PATH"];
            const arduinoComponentManager = new ArduinoComponentInstaller(
              idfPath,
              wsFolder.uri.fsPath,
              gitPath
            );
            cancelToken.onCancellationRequested(() => {
              arduinoComponentManager.cancel();
            });
            const arduinoDirPath = join(
              wsFolder.uri.fsPath,
              "components",
              "arduino"
            );
            const arduinoDirExists = await dirExistPromise(arduinoDirPath);
            if (arduinoDirExists) {
              return Logger.infoNotify(
                l10n.t(`{arduinoDirPath} already exists.`, {
                  arduinoDirPath,
                })
              );
            }
            await arduinoComponentManager.addArduinoAsComponent();
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            Logger.errorNotify(
              errorMsg,
              error as Error,
              "addArduinoAsComponentToCurFolder"
            );
          }
        }
      );
    }
  );
}
