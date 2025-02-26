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

import { readFile } from "fs-extra";
import {
  CancellationToken,
  ShellExecution,
  ShellExecutionOptions,
  TaskPanelKind,
  TaskPresentationOptions,
  TaskRevealKind,
  TaskScope,
  Uri,
  workspace,
} from "vscode";
import { NotificationMode, readParameter } from "../../idfConfiguration";
import { OutputChannel } from "../../logger/outputChannel";
import { parseStringPromise } from "xml2js";
import { TaskManager } from "../../taskManager";
import { Logger } from "../../logger/logger";
import { configureEnvVariables } from "../../common/prepareEnv";

export async function runPyTestWithTestCase(
  workspaceFolder: Uri,
  testName: string,
  cancelToken?: CancellationToken
) {
  try {
    await runTaskForCommand(
      workspaceFolder,
      `pytest --junitxml test.xml --skip-autoflash y --embedded-services esp,idf -s --test-name '${testName}'`,
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
  } catch (error) {
    const msg =
      error && error.message
        ? error.message
        : "Error configuring PyTest Unit App for project";
    OutputChannel.appendLine(msg, "idf-unit-test");
    Logger.error(msg, error, "runPyTestWithTestCase");
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
  const modifiedEnv = await configureEnvVariables(workspaceFolder);

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

  const notificationMode = readParameter(
    "idf.notificationMode",
    workspaceFolder
  ) as string;
  const showTaskOutput =
    notificationMode === NotificationMode.All ||
    notificationMode === NotificationMode.Output
      ? TaskRevealKind.Always
      : TaskRevealKind.Silent;

  const testRunPresentationOptions = {
    reveal: showTaskOutput,
    showReuseMessage: false,
    clear: true,
    panel: TaskPanelKind.Shared,
  } as TaskPresentationOptions;

  const curWorkspaceFolder = workspace.workspaceFolders.find(
    (w) => w.uri === workspaceFolder
  );

  const testRunExecution = new ShellExecution(cmdString, options);

  TaskManager.addTask(
    {
      type: "esp-idf",
      command: taskName,
      taskId: "idf-test-run-task",
    },
    curWorkspaceFolder || TaskScope.Workspace,
    "ESP-IDF " + taskName,
    testRunExecution,
    ["espIdf"],
    testRunPresentationOptions
  );
  await TaskManager.runTasks();
}
