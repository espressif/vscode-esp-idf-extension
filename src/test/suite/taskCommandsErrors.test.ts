/*
 * Project: ESP-IDF VSCode Extension
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

import * as assert from "assert";
import { ErrorSeverity } from "../../common/customNotifications";
import {
  buildRequiredBeforeFlash,
  isKnownError,
} from "../../common/error/knownError";
import { resolveKnownErrorUserMessage } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { getProjectName } from "../../configuration/workspace";
import { Uri } from "vscode";

const getProjectNameCommandErrorMapping = {
  [ErrorCode.BuildRequiredBeforeFlash]: {
    severity: ErrorSeverity.Error,
    userMessage:
      "Build the project first to read project_description.json. {buildDirPath} can't be accessed.",
    logMessage: "getProjectName blocked: {buildDirPath}.",
    actions: [],
  },
};

suite("Task command errors", () => {
  test("getProjectName throws BuildRequiredBeforeFlash when project description is missing", async () => {
    const workspaceUri = Uri.file("/tmp/missing-project-description");
    await assert.rejects(
      () => getProjectName(workspaceUri),
      (error: unknown) =>
        isKnownError(error) &&
        error.code === ErrorCode.BuildRequiredBeforeFlash
    );
  });

  test("getProjectName command error mapping interpolates buildDirPath", () => {
    const message = resolveKnownErrorUserMessage(
      buildRequiredBeforeFlash("/build/path"),
      getProjectNameCommandErrorMapping
    );
    assert.ok(message?.includes("/build/path"));
  });
});
