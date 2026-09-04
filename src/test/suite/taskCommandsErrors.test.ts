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
import {
  isKnownError,
} from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { getProjectName } from "../../configuration/workspace";
import { Uri } from "vscode";

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

});
