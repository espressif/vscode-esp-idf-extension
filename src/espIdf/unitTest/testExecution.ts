/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 19th July 2023 12:05:38 pm
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

import { copy, pathExists, readFile, writeFile } from "fs-extra";
import { join } from "path";
import {
  CancellationToken,
  ShellExecution,
  ShellExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  extensions,
} from "vscode";
import { ESP } from "../../config";
import { readParameter } from "../../idfConfiguration";
import { appendIdfAndToolsToPath, startPythonReqsProcess } from "../../utils";
import { buildCommand } from "../../build/buildCmd";
import { verifyCanFlash } from "../../flash/flashCmd";
import { flashCommand } from "../../flash/uartFlash";
import { jtagFlashCommand } from "../../flash/jtagCmd";
import { OutputChannel } from "../../logger/outputChannel";
import { parseStringPromise } from "xml2js";
import { TaskManager } from "../../taskManager";

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
  const requirementsPath = join(
    idfPath,
    "tools",
    "requirements",
    "requirements.pytest.txt"
  );
  let checkResult: string;
  try {
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
  const requirementsPath = join(
    idfPath,
    "tools",
    "requirements",
    "requirements.pytest.txt"
  );

  await runTaskForCommand(
    workspaceFolder,
    `"${pythonBinPath}" -m pip install --upgrade --no-warn-script-location -r "${requirementsPath}"`,
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

export async function configurePyTestUnitApp(
  workspaceFolder: Uri,
  testComponents: string[],
  cancelToken?: CancellationToken
) {
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
}

export async function runPyTestWithTestCase(
  workspaceFolder: Uri,
  testName: string,
  cancelToken?: CancellationToken
) {
  try {
    await runTaskForCommand(
      workspaceFolder,
      `pytest --junitxml test.xml --skip-autoflash y --embedded-services esp,idf -s --test-name "${testName}"`,
      "PyTest Run",
      cancelToken
    );
    const unitTestResults = await readFile(
      Uri.joinPath(workspaceFolder, "test.xml").fsPath
    );

    const xmlResults = await parseStringPromise(unitTestResults);

    if (xmlResults.testsuites) {
      for (const testSuite of xmlResults.testsuites.testsuite) {
        for (const testCase of testSuite.testcase) {
          if (
            Object.prototype.hasOwnProperty.call(testCase, "failure") ||
            Object.prototype.hasOwnProperty.call(testCase, "error") ||
            Object.prototype.hasOwnProperty.call(testCase, "skipped")
          ) {
            return false;
          } else {
            return true;
          }
        }
      }
    }

    console.log(xmlResults);
  } catch (error) {
    OutputChannel.appendLine(error);
  }
}

export async function runTaskForCommand(
  workspaceFolder: Uri,
  cmdString: string,
  taskName: string,
  cancelToken: CancellationToken
) {
  cancelToken.onCancellationRequested(() => {
    TaskManager.cancelTasks();
  });
  const modifiedEnv = appendIdfAndToolsToPath(workspaceFolder);

  const options: ShellExecutionOptions = {
    cwd: workspaceFolder.fsPath,
    env: modifiedEnv,
  };
  const shellExecutablePath = readParameter(
    "idf.customTerminalExecutable",
    workspaceFolder
  ) as string;
  const shellExecutableArgs = readParameter(
    "idf.customTerminalExecutableArgs",
    workspaceFolder
  ) as string[];
  if (shellExecutablePath) {
    options.executable = shellExecutablePath;
  }

  if (shellExecutableArgs && shellExecutableArgs.length) {
    options.shellArgs = shellExecutableArgs;
  }

  const isSilentMode = readParameter(
    "idf.notificationSilentMode",
    workspaceFolder
  ) as boolean;

  const showTaskOutput = isSilentMode
    ? TaskRevealKind.Always
    : TaskRevealKind.Silent;

  const testRunPresentationOptions = {
    reveal: showTaskOutput,
    showReuseMessage: false,
    clear: true,
    panel: TaskPanelKind.Shared,
  } as TaskPresentationOptions;

  const testRunExecution = new ShellExecution(cmdString, options);

  TaskManager.addTask(
    {
      type: "esp-idf",
      command: taskName,
      taskId: "idf-test-run-task",
    },
    TaskScope.Workspace, // Add Workspace Folder ?
    "ESP-IDF " + taskName,
    testRunExecution,
    ["espIdf"],
    testRunPresentationOptions
  );
  await TaskManager.runTasks();
}
