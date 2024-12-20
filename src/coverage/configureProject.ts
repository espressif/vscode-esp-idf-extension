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

import {
  extensionContext,
  getConfigValueFromSDKConfig,
  getEspIdfFromCMake,
} from "../utils";
import { NotificationMode, readParameter } from "../idfConfiguration";
import { ConfserverProcess } from "../espIdf/menuconfig/confServerProcess";
import {
  env,
  window,
  Uri,
  ProgressLocation,
  Progress,
  CancellationToken,
} from "vscode";
import {
  getDocsLocaleLang,
  getDocsVersion,
} from "../espIdf/documentation/getDocsVersion";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";

export async function configureProjectWithGcov(workspacePath: Uri) {
  const appTraceDestTrax = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_DEST_TRAX",
    workspacePath
  );
  const appTraceEnable = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_ENABLE",
    workspacePath
  );
  const appTraceLockEnable = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_LOCK_ENABLE",
    workspacePath
  );
  const onPanicHostFlushTmo = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_ONPANIC_HOST_FLUSH_TMO",
    workspacePath
  );
  const postmortemFlushThresh = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_POSTMORTEM_FLUSH_THRESH",
    workspacePath
  );
  const appTracePendingDataSizeMax = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_PENDING_DATA_SIZE_MAX",
    workspacePath
  );
  const appTraceGcovEnable = await getConfigValueFromSDKConfig(
    "CONFIG_APPTRACE_GCOV_ENABLE",
    workspacePath
  );

  const isGcovEnabled =
    appTraceDestTrax === "y" &&
    appTraceEnable === "y" &&
    appTraceLockEnable === "y" &&
    onPanicHostFlushTmo === "-1" &&
    postmortemFlushThresh === "0" &&
    appTracePendingDataSizeMax === "0" &&
    appTraceGcovEnable === "y";

  if (isGcovEnabled) {
    return window.showInformationMessage(
      "Code coverage is already enabled in sdkconfig"
    );
  }

  if (!ConfserverProcess.exists()) {
    const response = await window.showInformationMessage(
      "SDK Configuration Editor is not running. Start ?",
      "Start",
      "Cancel"
    );
    if (response !== "Start") {
      return;
    }
    const notificationMode = readParameter(
      "idf.notificationMode",
      workspacePath
    ) as string;
    const progressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    await window.withProgress(
      {
        cancellable: true,
        location: progressLocation,
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
  const gcovEnableRequest = `{"version": 2, "set": { "APPTRACE_DEST_TRAX": true, "APPTRACE_GCOV_ENABLE": true }}\n`;
  ConfserverProcess.sendUpdatedValue(gcovEnableRequest);
  ConfserverProcess.saveGuiConfigValues();
  await openCoverageUrl(workspacePath);
}

export async function openCoverageUrl(workspacePath: Uri) {
  const docsVersions = await getDocsVersion();
  const customExtraVars = readParameter(
        "idf.customExtraVars",
        workspacePath
      ) as { [key: string]: string };
  const idfPath = customExtraVars["IDF_PATH"];
  let idfVersion = "v" + (await getEspIdfFromCMake(idfPath));
  let idfTarget = await getIdfTargetFromSdkconfig(workspacePath);
  let docVersion = docsVersions.find((docVer) => docVer.name === idfVersion);
  let targetToUse: string = "esp32";
  if (!docVersion) {
    docVersion = docsVersions.find((docVer) => docVer.name === "latest");
  }
  if (
    docVersion.supportedTargets &&
    docVersion.supportedTargets.indexOf(idfTarget) !== -1
  ) {
    targetToUse = idfTarget;
  }
  const localeLang = getDocsLocaleLang();
  const coverageDocUrl = `https://docs.espressif.com/projects/esp-idf/${localeLang}/${docVersion.name}/${targetToUse}/api-guides/app_trace.html#compiler-option`;
  const option = await window.showInformationMessage(
    "Your project sdkconfig has been configured. Make sure to compile the source file with the --coverage option.",
    "See the docs"
  );
  if (option === "See the docs") {
    env.openExternal(Uri.parse(coverageDocUrl));
  }
}
