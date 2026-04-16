/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 3rd August 2023 3:30:15 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { CancellationToken, Uri, extensions } from "vscode";
import { ESP } from "../../config";
import { join } from "path";
import { copy, pathExists, readFile, writeFile } from "fs-extra";
import { readParameter } from "../../idfConfiguration";
import { buildMain } from "../../build/buildMain";
import { flashMain } from "../../flash/main";
import { OutputChannel } from "../../logger/outputChannel";
import { Logger } from "../../logger/logger";
import { getFileList, getTestComponents } from "./utils";

export async function configureUnityApp(
  workspaceFolder: Uri,
  cancelToken?: CancellationToken
) {
  try {
    let unitTestAppUri = Uri.joinPath(workspaceFolder, "unity-app");
    const doesUnitTestAppExists = await pathExists(unitTestAppUri.fsPath);
    if (!doesUnitTestAppExists) {
      const unitTestFiles = await getFileList();
      const testComponents = await getTestComponents(unitTestFiles);
      unitTestAppUri = await copyTestAppProject(
        workspaceFolder,
        testComponents
      );
      await buildFlashTestApp(unitTestAppUri, cancelToken);
    }
    return unitTestAppUri;
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : "Error configuring Unity App for project";
    OutputChannel.appendLine(msg, "idf-unit-test");
    Logger.error(msg, error, "configureUnityApp");
  }
}

export async function copyTestAppProject(
  workspaceFolder: Uri,
  testComponents: string[]
) {
  let unityAppDir: string = join(
    extensions.getExtension(ESP.extensionID).extensionPath,
    "templates",
    "unity-app"
  );
  let destUnityAppDir = Uri.joinPath(workspaceFolder, "unity-app");
  await copy(unityAppDir, destUnityAppDir.fsPath);
  await updateTestComponents(destUnityAppDir, testComponents);
  return destUnityAppDir;
}

export async function updateTestComponents(
  unityApp: Uri,
  testComponents: string[]
) {
  const cmakeListFile = Uri.joinPath(unityApp, "CMakeLists.txt");
  if (pathExists(cmakeListFile.fsPath)) {
    let content = await readFile(cmakeListFile.fsPath, "utf-8");
    const projectMatches = content.match(/(project\(.*?\))/g);
    if (projectMatches && projectMatches.length) {
      content = content.replace(
        /set\(TEST_COMPONENTS ""\)/g,
        `set(TEST_COMPONENTS "${testComponents.join(" ")}")`
      );
      await writeFile(cmakeListFile.fsPath, content);
    }
  }
}

export async function buildTestApp(
  unitTestAppDirPath: Uri,
  cancelToken: CancellationToken
) {
  let flashType = readParameter(
    "idf.flashType",
    unitTestAppDirPath
  ) as ESP.FlashType;
  if (!flashType) {
    flashType = ESP.FlashType.UART;
  }
  let buildCmdResults = await buildMain(
    unitTestAppDirPath,
    cancelToken,
    flashType
  );
  if (!buildCmdResults.continueFlag) {
    return;
  }
}

export async function flashTestApp(
  unitTestAppDirPath: Uri,
  cancelToken: CancellationToken
) {
  let flashType = readParameter(
    "idf.flashType",
    unitTestAppDirPath
  ) as ESP.FlashType;
  if (!flashType) {
    flashType = ESP.FlashType.UART;
  }
  await flashMain(
    unitTestAppDirPath,
    cancelToken,
    flashType,
    false
  );
}

export async function buildFlashTestApp(
  unitTestAppDirPath: Uri,
  cancelToken: CancellationToken
) {
  await buildTestApp(unitTestAppDirPath, cancelToken);
  await flashTestApp(unitTestAppDirPath, cancelToken);
}
