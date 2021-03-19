/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 18th March 2021 9:41:56 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { extensionContext, getConfigValueFromSDKConfig } from "../utils";
import { ConfserverProcess } from "../espIdf/menuconfig/confServerProcess";
import {
  window,
  Uri,
  ProgressLocation,
  Progress,
  CancellationToken,
} from "vscode";
import { MenuConfigPanel } from "../espIdf/menuconfig/MenuconfigPanel";

export async function configureProjectWithGcov(workspacePath: Uri) {
  const appTraceDestTrax = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_DEST_TRAX",
    workspacePath.fsPath
  );
  const appTraceEnable = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_ENABLE",
    workspacePath.fsPath
  );
  const appTraceLockEnable = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_LOCK_ENABLE",
    workspacePath.fsPath
  );
  const onPanicHostFlushTmo = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_ONPANIC_HOST_FLUSH_TMO",
    workspacePath.fsPath
  );
  const postmortemFlushThresh = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_POSTMORTEM_FLUSH_THRESH",
    workspacePath.fsPath
  );
  const appTracePendingDataSizeMax = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_PENDING_DATA_SIZE_MAX",
    workspacePath.fsPath
  );
  const appTraceGcovEnable = getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_GCOV_ENABLE",
    workspacePath.fsPath
  );

  const isGcovEnabled =
    appTraceDestTrax === "y" &&
    appTraceEnable === "y" &&
    appTraceLockEnable === "y" &&
    onPanicHostFlushTmo === "-1" &&
    postmortemFlushThresh === "0" &&
    appTracePendingDataSizeMax === "0" &&
    appTraceGcovEnable === "y";

  // if (isGcovEnabled) {
  //   return;
  // }

  if (!ConfserverProcess.exists()) {
    const response = await window.showInformationMessage(
      "SDK Configuration Editor is not running. Start ?",
      "Start",
      "Cancel"
    );
    if (response !== "Start") {
      return;
    }
    await window.withProgress(
      {
        cancellable: true,
        location: ProgressLocation.Notification,
        title: "ESP-IDF: Configuring coverage",
      },
      async (
        progress: Progress<{ message: string; increment: number }>,
        cancelToken: CancellationToken
      ) => {
        ConfserverProcess.registerProgress(progress);
        cancelToken.onCancellationRequested(() => {
          ConfserverProcess.dispose();
        });
        await ConfserverProcess.init(
          workspacePath,
          extensionContext.extensionPath
        );
      }
    );
  }
  const destTraxRequest = `{"version": 2, "set": { "APPTRACE_DEST_TRAX": true }}\n`;
  const gcovEnableRequest = `{"version": 2, "set": { "APPTRACE_GCOV_ENABLE": true }}\n`;
  ConfserverProcess.sendUpdatedValue(destTraxRequest);
  ConfserverProcess.sendUpdatedValue(gcovEnableRequest);
  ConfserverProcess.saveGuiConfigValues();
}
