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
import { startPythonReqsProcess } from "../../utils";
import { runTaskForCommand } from "./testExecution";
import { buildCommand } from "../../build/buildCmd";
import { verifyCanFlash } from "../../flash/flashCmd";
import { jtagFlashCommand } from "../../flash/jtagCmd";
import { flashCommand } from "../../flash/uartFlash";
import { OutputChannel } from "../../logger/outputChannel";
import { Logger } from "../../logger/logger";

export async function configurePyTestUnitApp(
  workspaceFolder: Uri,
  testComponents: string[],
  cancelToken?: CancellationToken
) {
  try {
    const isPyTestInstalled = await checkPytestRequirements(workspaceFolder);
    if (!isPyTestInstalled) {
      await installPyTestPackages(workspaceFolder, cancelToken);
    }
    const unityTestApp = await copyTestAppProject(
      workspaceFolder,
      testComponents
    );
    await buildFlashTestApp(unityTestApp, cancelToken);
    return unityTestApp;
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : "Error configuring PyTest Unit App for project";
    OutputChannel.appendLine(msg, "idf-unit-test");
    Logger.error(msg, error);
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

export async function checkPytestRequirements(workspaceFolder: Uri) {
  const idfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const pythonBinPath = readParameter("idf.pythonBinPath", workspaceFolder);
  let requirementsPath = join(
    idfPath,
    "tools",
    "requirements",
    "requirements.pytest.txt"
  );
  let checkResult: string;
  try {
    const doesPyTestRequirementsExists = await pathExists(requirementsPath);
    if (!doesPyTestRequirementsExists) {
      requirementsPath = join(
        extensions.getExtension(ESP.extensionID).extensionPath,
        "requirements.pytest.txt"
      );
    }
    checkResult = await startPythonReqsProcess(
      pythonBinPath,
      idfPath,
      requirementsPath
    );
  } catch (error) {
    checkResult = error && error.message ? error.message : " are not satisfied";
  }
  if (checkResult.indexOf("are satisfied") > -1) {
    return true;
  }
  return false;
}

export async function installPyTestPackages(
  workspaceFolder: Uri,
  cancelToken?: CancellationToken
) {
  const idfPath = readParameter("idf.espIdfPath", workspaceFolder);
  const pythonBinPath = readParameter("idf.pythonBinPath", workspaceFolder);
  let requirementsPath = join(
    idfPath,
    "tools",
    "requirements",
    "requirements.pytest.txt"
  );

  const doesPyTestRequirementsExists = await pathExists(requirementsPath);
  if (!doesPyTestRequirementsExists) {
    requirementsPath = join(
      extensions.getExtension(ESP.extensionID).extensionPath,
      "requirements.pytest.txt"
    );
  }

  await runTaskForCommand(
    workspaceFolder,
    `"${pythonBinPath}" -m pip install --upgrade --no-warn-script-location -r "${requirementsPath}" --extra-index-url https://dl.espressif.com/pypi`,
    "Install Pytest",
    cancelToken
  );
}

export async function buildFlashTestApp(
  workspaceFolder: Uri,
  cancelToken: CancellationToken
) {
  const flashType = readParameter("idf.flashType", workspaceFolder);
  let canContinue = await buildCommand(workspaceFolder, cancelToken, flashType);
  if (!canContinue) {
    return;
  }
  const port = readParameter("idf.port", workspaceFolder);
  const flashBaudRate = readParameter("idf.flashBaudRate", workspaceFolder);
  const idfPathDir = readParameter("idf.espIdfPath", workspaceFolder) as string;
  const canFlash = await verifyCanFlash(flashBaudRate, port, workspaceFolder);
  if (!canFlash) {
    return;
  }
  if (flashType === ESP.FlashType.JTAG) {
    canContinue = await jtagFlashCommand(workspaceFolder);
  } else {
    canContinue = await flashCommand(
      cancelToken,
      flashBaudRate,
      idfPathDir,
      port,
      workspaceFolder,
      flashType,
      false
    );
  }
  if (!canContinue) {
    return;
  }
}
