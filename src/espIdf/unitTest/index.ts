/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 4:46:38 pm
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

import { ExtensionContext, l10n, Uri } from "vscode";
import { openFolderCheck } from "../../common/PreCheck";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { registerIDFCommand } from "../../common/registerCommand";
import { Logger } from "../../common/logger";
import { OutputChannel } from "../../common/outputChannel";
import { pathExists } from "fs-extra";
import { getFileList, getTestComponents } from "./utils";
import {
  buildFlashTestApp,
  buildTestApp,
  copyTestAppProject,
  flashTestApp,
} from "./configure";
import { ESP } from "../../config";
import { UnitTest } from "./adapter";

export function addUnitTestCommands(context: ExtensionContext) {
  new UnitTest(context);
  registerIDFCommand(context, "espIdf.unitTest.buildUnitTestApp", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Building unit test app"),
      async (_progress, cancelToken) => {
        try {
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          let unitTestAppUri = Uri.joinPath(wsFolder.uri, "unity-app");
          const doesUnitTestAppExists = await pathExists(unitTestAppUri.fsPath);
          if (!doesUnitTestAppExists) {
            const unitTestFiles = await getFileList();
            const testComponents = await getTestComponents(unitTestFiles);
            unitTestAppUri = await copyTestAppProject(
              wsFolder.uri,
              testComponents
            );
          }
          await buildTestApp(unitTestAppUri, cancelToken);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          OutputChannel.appendLine(msg, "idf-unit-test");
          Logger.error(msg, error as Error, "buildUnitTestApp");
        }
      }
    );
  });

  registerIDFCommand(context, "espIdf.unitTest.flashUnitTestApp", async () => {
    await withProgressWrapper(
      [openFolderCheck],
      l10n.t("ESP-IDF: Building unit test app and flashing"),
      async (_progress, cancelToken) => {
        try {
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          let unitTestAppUri = Uri.joinPath(wsFolder.uri, "unity-app");
          const doesUnitTestAppExists = await pathExists(unitTestAppUri.fsPath);
          if (!doesUnitTestAppExists) {
            const unitTestFiles = await getFileList();
            const testComponents = await getTestComponents(unitTestFiles);
            unitTestAppUri = await copyTestAppProject(
              wsFolder.uri,
              testComponents
            );
          }
          await flashTestApp(unitTestAppUri, cancelToken);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          OutputChannel.appendLine(msg, "idf-unit-test");
          Logger.error(msg, error as Error, "flashUnitTestApp");
        }
      }
    );
  });

  registerIDFCommand(
    context,
    "espIdf.unitTest.buildFlashUnitTestApp",
    async () => {
      await withProgressWrapper(
        [openFolderCheck],
        l10n.t("ESP-IDF: Building unit test app and flashing"),
        async (_progress, cancelToken) => {
          try {
            const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
            let unitTestAppUri = Uri.joinPath(wsFolder.uri, "unity-app");
            const doesUnitTestAppExists = await pathExists(
              unitTestAppUri.fsPath
            );
            if (!doesUnitTestAppExists) {
              const unitTestFiles = await getFileList();
              const testComponents = await getTestComponents(unitTestFiles);
              unitTestAppUri = await copyTestAppProject(
                wsFolder.uri,
                testComponents
              );
            }
            await buildFlashTestApp(unitTestAppUri, cancelToken);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            OutputChannel.appendLine(msg, "idf-unit-test");
            Logger.error(
              msg,
              error instanceof Error ? error : new Error(String(error)),
              "buildFlashUnitTestApp"
            );
          }
        }
      );
    }
  );
}
