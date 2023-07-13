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

import { lstat, readFile, readdir } from "fs-extra";
import { basename, relative, resolve } from "path";
import {
  ExtensionContext,
  TestController,
  window,
  tests,
  Uri,
  CancellationToken,
  TestRunProfileKind,
  TestRunRequest,
  TestItem,
  TestMessage,
  workspace,
  RelativePattern,
} from "vscode";
import { EspIdfTestItem, idfTestData } from "./tree";
import { readParameter } from "../../idfConfiguration";

const unitTestControllerId = "IDF_UNIT_TEST_CONTROLLER";
const unitTestControllerLabel = "ESP-IDF Unit test controller";

export class UnitTest {
  public unitTestController: TestController;
  private testCaseRegex: RegExp;

  constructor(context: ExtensionContext) {
    this.unitTestController = tests.createTestController(
      unitTestControllerId,
      unitTestControllerLabel
    );
    const testCaseRegexStr = readParameter("idf.testCaseRegex") as string;
    this.testCaseRegex = new RegExp(testCaseRegexStr);

    this.unitTestController.refreshHandler = async (
      cancelToken?: CancellationToken
    ) => {
      const fileList = await this.getFileList();
      await this.loadTests(fileList);
    };

    this.unitTestController.createRunProfile(
      "Run Tests",
      TestRunProfileKind.Run,
      this.runHandler,
      true,
      undefined,
      true
    );

    this.unitTestController.resolveHandler = async (item: TestItem) => {
      if (!item) {
        const fileList = await this.getFileList();
        await this.loadTests(fileList);
        return;
      }
      const espIdfTestItem = await this.getTestsForFile(item.uri);
      for (const child of espIdfTestItem.children) {
        item.children.add(
          this.unitTestController.createTestItem(
            child.id,
            child.label,
            child.uri
          )
        );
      }
      this.unitTestController.items.add(item);
    };
    context.subscriptions.push(this.unitTestController);
  }

  async getOrCreateFile(file: Uri) {
    const existing = this.unitTestController.items.get(file.toString());
    if (existing) {
      return {
        testItem: existing,
        espIdfTestItem: idfTestData.get(existing) as EspIdfTestItem,
      };
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
    };
    return { testItem, espIdfTestItem };
  }

  async runHandler(request: TestRunRequest, cancelToken: CancellationToken) {
    const testRun = this.unitTestController.createTestRun(request);
    const queue: TestItem[] = [];

    if (request.include) {
      request.include.forEach((test) => queue.push(test));
    } else {
      this.unitTestController.items.forEach((t) => queue.push(t));
    }

    while (queue.length > 0 && !cancelToken.isCancellationRequested) {
      const test = queue.pop();

      if (request.exclude?.includes(test)) {
        continue;
      }

      const idfTestitem = idfTestData.get(test);
      if (testRun.token.isCancellationRequested) {
        testRun.skipped(test);
      } else {
        testRun.appendOutput(`Running ${test.id}\r\n`);
        testRun.started(test);
        const startTime = Date.now();
        try {
          // add actual test execution here
          testRun.passed(test, Date.now() - startTime);
        } catch (error) {
          testRun.failed(
            test,
            new TestMessage(error.message),
            Date.now() - startTime
          );
        }
        testRun.appendOutput(`Completed ${test.id}\r\n`);
      }
      test.children.forEach((t) => queue.push(t));
    }
    testRun.end();
  }

  private async getFileList(): Promise<Uri[]> {
    let files: Uri[] = [];

    try {
      const fileRegexStr = readParameter("idf.testFileRegex") as string;
      files = await workspace.findFiles("**/test_*.c");
    } catch (err) {
      window.showErrorMessage("Cannot find test result path!", err);
      return [];
    }
    return files;
  }

  async getTestsForFile(file: Uri) {
    const fileLabel = this.setLabel(file.fsPath);
    const currentTestSuiteInfo: EspIdfTestItem = {
      type: "suite",
      id: file.fsPath,
      label: fileLabel,
      filePath: file.fsPath,
      children: [],
    };
    const testRegex = new RegExp(this.testCaseRegex, "gm");
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
        type: "test",
        id: file.toString() + "::" + testName,
        label: testLabel,
        uri: file,
        line: line,
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
      const currentTestSuiteInfo = await this.getOrCreateFile(file);
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
