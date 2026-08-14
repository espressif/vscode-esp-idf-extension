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
  l10n,
} from "vscode";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck, PreCheck } from "../../common/PreCheck";
import {
  isSettingIDFTarget,
  setIdfTarget,
  setIsSettingIDFTarget,
} from "./main";
import { getTargetsFromEspIdf } from "./getTargets";
import { setTargetInIDF } from "./setTargetInIdf";
import { readParameter, writeParameter } from "../../configuration/idf";
import { updateCurrentProfileIdfTarget } from "../../project-conf";
import { getIdfTargetFromSdkconfig } from "../../configuration/workspace";
import { statusBarItems } from "../../statusBar";
import { ESP } from "../../config";
import {
  idfTaskInProgress,
  invalidIdfTarget,
  IdfTaskName,
} from "../../common/error/knownError";
import { setTargetErrorPresentation } from "./setTargetErrorPresentation";

export function registerSetTargetCommand(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.setTarget",
    (target?: string) => {
      return PreCheck.perform([openFolderCheck], async () => {
        const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!wsFolder) {
          return;
        }

        if (target) {
          if (isSettingIDFTarget) {
            throw idfTaskInProgress(
              IdfTaskName.SetTarget,
              setTargetErrorPresentation.idfTaskInProgress
            );
          }
          setIsSettingIDFTarget(true);

          try {
            const targetsFromIdf = await getTargetsFromEspIdf();
            const selectedTarget = targetsFromIdf.find(
              (t) => t.target === target
            );

            if (!selectedTarget) {
              throw invalidIdfTarget(
                target,
                targetsFromIdf.map((t) => t.target),
                setTargetErrorPresentation.invalidIdfTarget
              );
            }

            await setTargetInIDF(wsFolder.uri, selectedTarget);

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
          } finally {
            setIsSettingIDFTarget(false);
          }
        } else {
          const enterDeviceTargetMsg = l10n.t("Enter target name (IDF_TARGET)");
          await setIdfTarget(enterDeviceTargetMsg, wsFolder);
          await getIdfTargetFromSdkconfig(wsFolder.uri, statusBarItems["target"]);
        }
      });
    },
    { outputChannel: "Set Target" }
  );
}
