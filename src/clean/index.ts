/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th June 2026 4:11:10 pm
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
import { registerIDFCommand } from "../common/registerCommand";
import { openFolderCheck, PreCheck } from "../common/PreCheck";
import { readParameter } from "../configuration/idf";
import { canAccessFile, dirExistPromise } from "../utils";
import { OutputChannel } from "../common/outputChannel";
import { Logger } from "../common/logger";
import { ConfserverProcess } from "../espIdf/menuconfig/confserver/confServerProcess";
import { join } from "path";
import { constants } from "fs/promises";
import { FlashSession } from "../flash/shared/flashSession";
import { BuildTask } from "../build/buildTask";
import del from "del";
import { pathExists } from "fs-extra";
import { ESP } from "../config";

export async function registerFullCleanCmd(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.fullClean", () => {
    PreCheck.perform([openFolderCheck], async () => {
      const selectWorkspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!selectWorkspaceFolder) {
        const errStr = l10n.t("Open a folder first.");
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }
      const buildDir = readParameter("idf.buildPath", selectWorkspaceFolder) as string;
      const buildDirExists = await dirExistPromise(buildDir);
      if (!buildDirExists) {
        const errStr = l10n.t("There is no build directory to clean, exiting!");
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }
      if (ConfserverProcess.exists()) {
        const closingSDKConfigMsg = l10n.t(
          `Trying to delete the build folder. Closing existing SDK Configuration editor process...`
        );
        OutputChannel.init().appendLine(closingSDKConfigMsg);
        Logger.info(closingSDKConfigMsg);
        ConfserverProcess.dispose();
      }
      const cmakeCacheFile = join(buildDir, "CMakeCache.txt");
      const doesCmakeCacheExists = canAccessFile(
        cmakeCacheFile,
        constants.R_OK
      );
      if (!doesCmakeCacheExists) {
        const errStr = l10n.t(
          `There is no CMakeCache.txt. Please try to delete the build directory manually.`
        );
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }
      if (BuildTask.isBuilding || FlashSession.isFlashing) {
        const errStr = l10n.t(
          `There is a build or flash task running. Wait for it to finish or cancel them before clean.`
        );
        OutputChannel.appendLineAndShow(errStr);
        return Logger.warnNotify(errStr);
      }

      try {
        await del(buildDir, { force: true });
        const extraPathsToClean = readParameter(
          "idf.extraCleanPaths",
          selectWorkspaceFolder
        ) as string[];
        if (extraPathsToClean && extraPathsToClean.length > 0) {
          for (const extraPath of extraPathsToClean) {
            const fullPath = join(selectWorkspaceFolder.uri.fsPath, extraPath);
            const doesExtraPathExist = await pathExists(fullPath);
            if (doesExtraPathExist) {
              await del(fullPath, { force: true });
            }
          }
        }
        Logger.infoNotify(l10n.t("Build directory has been deleted."));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        OutputChannel.appendLineAndShow(errorMsg);
        Logger.errorNotify(errorMsg, error as Error, "extension fullClean");
      }
    });
  });
}
