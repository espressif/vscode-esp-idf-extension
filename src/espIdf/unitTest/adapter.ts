/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th July 2023 6:32:23 pm
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
import { basename } from "path";
import {
  ExtensionContext,
  TestController,
  tests,
  Uri,
  CancellationToken,
  TestRunProfileKind,
  TestRunRequest,
  TestItem,
  TestMessage,
  workspace,
  Location,
  Range,
} from "vscode";
import { EspIdfTestItem, idfTestData } from "./types";
import { configureUnityApp } from "./configure";
import { getFileList } from "./utils";
import { ESP } from "../../config";
import { UnityTestRunner } from "./unityRunner/unityTestRunner";
import { readParameter, readSerialPort } from "../../idfConfiguration";
import { UnityParserOptions } from "./unityRunner/types";
import { Logger } from "../../logger/logger";

const unitTestControllerId = "IDF_UNIT_TEST_CONTROLLER";
const unitTestControllerLabel = "ESP-IDF Unit test controller";

export class UnitTest {
  public unitTestController: TestController;
  private unitTestAppUri: Uri;

  constructor(context: ExtensionContext) {
    this.unitTestController = tests.createTestController(
      unitTestControllerId,
      unitTestControllerLabel
    );

    this.unitTestController.refreshHandler = async (
      cancelToken?: CancellationToken
    ) => {
      this.clearExistingTestCaseItems();
      const fileList = await getFileList();
      await this.loadTests(fileList);
    };

    const runHandler = async (
      request: TestRunRequest,
      cancelToken: CancellationToken
    ) => {
      const testRun = this.unitTestController.createTestRun(request);
      const queue: TestItem[] = [];

      if (request.include) {
        request.include.forEach((test) => {
          test.children.forEach((testChild) => {
            queue.push(testChild);
          });
          queue.push(test);
        });
      } else {
        this.unitTestController.items.forEach((t) => queue.push(t));
      }

      let workspaceFolderUri: Uri | undefined;
      if (!this.unitTestAppUri) {
        try {
          // Get stored workspace folder URI and ensure it's a proper vscode.Uri object
          const storedUri = ESP.GlobalConfiguration.store.get<Uri>(
            ESP.GlobalConfiguration.SELECTED_WORKSPACE_FOLDER
          );
          let workspaceFolder = workspace.getWorkspaceFolder(storedUri);

          workspaceFolderUri = workspaceFolder
            ? workspaceFolder.uri
            : undefined;

          // Fallback to first workspace folder if no stored URI or conversion failed
          if (!workspaceFolderUri && workspace.workspaceFolders?.length > 0) {
            workspaceFolderUri = workspace.workspaceFolders[0].uri;
          }

          if (!workspaceFolderUri) {
            Logger.warn(
              "No workspace folder available for unit test configuration"
            );
            return;
          }

          this.unitTestAppUri = await configureUnityApp(
            workspaceFolderUri,
            cancelToken
          );
        } catch (error) {
          Logger.error("Failed to configure unit test app:", error, "unitTest runHandler configurePytestUnitApp");
          return;
        }
      }

      const runner = new UnityTestRunner();

      const serialPort = await readSerialPort(workspaceFolderUri, false);
      const baudRate =
        (readParameter("idf.baudRate", workspaceFolderUri) as number) || 115200;
      const runnerOptions: UnityParserOptions = {
        port: serialPort,
        baudRate: baudRate,
        showOutput: true,
      };
      try {
        await runner.runFromSerial(runnerOptions);

        while (queue.length > 0 && !cancelToken.isCancellationRequested) {
          const test = queue.pop();

          if (request.exclude?.includes(test)) {
            continue;
          }

          const idfTestitem = idfTestData.get(test);

          if (testRun.token.isCancellationRequested) {
            testRun.skipped(test);
          } else if (idfTestitem.type !== "suite") {
            testRun.appendOutput(`Running ${test.id}\r\n`);
            testRun.started(test);
            const startTime = Date.now();
            try {
              const result = await runner.runTestFromSerialByName(test.label);
              if (!result) {
                throw new Error("No result from test execution");
              }
              testRun.appendOutput(
                result.output + `\r\n`,
                test.uri && typeof result.lineNumber === "number"
                  ? new Location(
                      test.uri,
                      new Range(result.lineNumber, 0, result.lineNumber, 0)
                    )
                  : undefined,
                test
              );
              if (result.status === "PASS") {
                testRun.passed(test, result.duration);
              } else if (result.status === "FAIL") {
                const message = new TestMessage(
                  result.message || "Test failed"
                );
                testRun.failed(test, message, result.duration);
              } else if (result.status === "IGNORE") {
                testRun.skipped(test);
              }
            } catch (error) {
              testRun.failed(
                test,
                new TestMessage(error.message),
                Date.now() - startTime
              );
              runner.stop();
            }
            testRun.appendOutput(`\r\nCompleted ${test.id}\r\n`);
          }
          test.children.forEach((t) => queue.push(t));
        }
      } catch (error) {
        testRun.appendOutput(`Error: ${error.message}\r\n`);
        runner.stop();
        testRun.end();
      } finally {
        runner.stop();
        testRun.end();
      }
    };

    this.unitTestController.createRunProfile(
      "Run Tests",
      TestRunProfileKind.Run,
      runHandler,
      true,
      undefined,
      false
    );

    this.unitTestController.resolveHandler = async (item: TestItem) => {
      if (!item) {
        const fileList = await getFileList();
        await this.loadTests(fileList);
        return;
      }
      const espIdfTestItem = await this.getTestsForFile(item.uri);
      for (const child of espIdfTestItem.children) {
        const childItem = this.unitTestController.createTestItem(
          child.id,
          child.label,
          child.uri
        );
        item.children.add(childItem);
        idfTestData.set(childItem, child);
      }
      idfTestData.set(item, espIdfTestItem);
      this.unitTestController.items.add(item);
    };
    context.subscriptions.push(this.unitTestController);
  }

  clearExistingTestCaseItems() {
    this.unitTestController.items.forEach((item) =>
      this.unitTestController.items.delete(item.id)
    );
  }

  async createFileTestCaseItems(file: Uri) {
    const existing = this.unitTestController.items.get(file.toString());
    if (existing) {
      this.unitTestController.items.delete(existing.id);
    }
    const testItem = this.unitTestController.createTestItem(
      file.toString(),
      file.fsPath.split("/").pop(),
      file
    );
    testItem.canResolveChildren = true;
    this.unitTestController.items.add(testItem);
    const espIdfTestItem: EspIdfTestItem = {
      type: "suite",
      id: file.fsPath,
      label: file.fsPath.split("/").pop(),
      filePath: file.fsPath,
      children: [],
      uri: file,
      testName: "TEST_ALL",
    };
    idfTestData.set(testItem, espIdfTestItem);
    return { testItem, espIdfTestItem };
  }

  async getTestsForFile(file: Uri) {
    const fileLabel = this.setLabel(file.fsPath);
    const currentTestSuiteInfo: EspIdfTestItem = {
      type: "suite",
      id: file.fsPath,
      label: fileLabel,
      filePath: file.fsPath,
      children: [],
      testName: "TEST_ALL",
    };
    const testRegex = new RegExp(
      'TEST_CASE\\(\\s*"(.*)"\\s*,\\s*"(.*)"\\s*\\)',
      "gm"
    );
    const fileText = await readFile(file.fsPath, "utf8");
    let match = testRegex.exec(fileText);
    while (match != null) {
      let testName = match[1];
      const testLabel = this.setLabel(testName);
      let line = fileText.substring(0, match.index).split("\n").length - 1;
      line =
        line +
        match[0].substring(0, match[0].search(/\S/g)).split("\n").length -
        1;
      currentTestSuiteInfo.children.push({
        id: file.toString() + "::" + testName,
        label: testLabel,
        line: line,
        uri: file,
        testName,
        type: "test",
      } as EspIdfTestItem);
      match = testRegex.exec(fileText);
    }
    return currentTestSuiteInfo;
  }

  async loadTests(files: Uri[]): Promise<EspIdfTestItem> {
    let localTestSuiteInfo = {
      type: "suite",
      id: "root",
      label: "espidf-unity",
      children: [],
    } as EspIdfTestItem;

    for (const file of files) {
      const currentTestSuiteInfo = await this.createFileTestCaseItems(file);
      localTestSuiteInfo.children.push(currentTestSuiteInfo.espIdfTestItem);
    }

    return localTestSuiteInfo;
  }

  private setLabel(fileName: string, labelRegex?: RegExp): string {
    let fileLabel = basename(fileName);
    if (labelRegex) {
      let labelMatches = labelRegex.exec(fileName);
      if (labelMatches != null) {
        fileLabel = labelMatches[1];
      }
    }
    return fileLabel;
  }
}
