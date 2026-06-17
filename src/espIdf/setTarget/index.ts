/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 16th June 2026 5:26:53 pm
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

import {
  ConfigurationTarget,
  ExtensionContext,
  window,
  l10n,
} from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck, PreCheck } from "../../common/PreCheck";
import {
  isSettingIDFTarget,
  setIdfTarget,
  setIsSettingIDFTarget,
} from "./main";
import { Logger } from "../../common/logger";
import { getTargetsFromEspIdf } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";
import { readParameter, writeParameter } from "../../configuration/idf";
import { updateCurrentProfileIdfTarget } from "../../project-conf/utils";
import { getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import { statusBarItems } from "../../statusBar";
import { ESP } from "../../config";

export async function registerSetTargetCommand(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.setTarget", (target?: string) => {
    PreCheck.perform([openFolderCheck], async () => {
      const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!wsFolder) {
        return;
      }

      if (target) {
        // Check if target setting is already in progress
        if (isSettingIDFTarget) {
          Logger.info("setTargetInIDF is already running.");
          return;
        }
        setIsSettingIDFTarget(true);

        try {
          // If a target is provided, set it directly
          const targetsFromIdf = await getTargetsFromEspIdf(
            wsFolder.uri
          );
          const selectedTarget = targetsFromIdf.find(
            (t) => t.target === target
          );

          if (selectedTarget) {
            await setTargetInIDF(wsFolder.uri, selectedTarget);

            // Update configuration like setIdfTarget does
            const configurationTarget = ConfigurationTarget.WorkspaceFolder;
            const customExtraVars = readParameter(
              "idf.customExtraVars",
              wsFolder
            ) as { [key: string]: string };
            customExtraVars["IDF_TARGET"] = selectedTarget.target;
            await writeParameter(
              "idf.customExtraVars",
              customExtraVars,
              configurationTarget,
              wsFolder
            );
            await updateCurrentProfileIdfTarget(
              selectedTarget.target,
              wsFolder.uri
            );

            await getIdfTargetFromSdkconfig(
              wsFolder.uri,
              statusBarItems["target"]
            );
          } else {
            const listOfTargets = targetsFromIdf
              .map((t) => t.target)
              .join(", ");
            window.showErrorMessage(
              `Invalid target: ${target}. Please use one of the supported targets: ${listOfTargets}.`
            );
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(
            errMsg,
            error as Error,
            "espIdf.setTarget command"
          );
        } finally {
          setIsSettingIDFTarget(false);
        }
      } else {
        // If no target is provided, show the selection dialog
        const enterDeviceTargetMsg = l10n.t("Enter target name (IDF_TARGET)");
        await setIdfTarget(enterDeviceTargetMsg, wsFolder);
        await getIdfTargetFromSdkconfig(wsFolder.uri, statusBarItems["target"]);
      }
    });
  });
}
