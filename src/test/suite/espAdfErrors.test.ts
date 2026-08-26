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
  missingDependency,
  noWorkspaceOpen,
  repositoryCloneFailed,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { espAdfErrorPresentation } from "../../espAdf/espAdfErrorPresentation";

suite("ESP-ADF command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("presentation applies ESP-ADF output channel for missing Git", () => {
      const descriptor = resolveKnownErrorDescriptor(
        missingDependency("Git", espAdfErrorPresentation.missingDependency)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "ESP-ADF");
      assert.strictEqual(descriptor?.actions[0].label, "View Output");
    });

    test("omitting actions keeps Open Folder for NO_WORKSPACE_OPEN", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noWorkspaceOpen(espAdfErrorPresentation.noWorkspaceOpen)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "ESP-ADF");
      assert.strictEqual(descriptor?.actions[0].label, "Open Folder…");
    });

    test("registry interpolates repo name for RepositoryCloneFailed", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          repositoryCloneFailed("ESP-ADF", "git clone failed")
        ),
        "Failed to clone ESP-ADF. git clone failed"
      );
    });
  });

  suite("KnownError factories", () => {
    test("repositoryCloneFailed uses RepositoryCloneFailed code", () => {
      const error = repositoryCloneFailed("ESP-ADF", "timeout");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.RepositoryCloneFailed);
      assert.strictEqual(error.metadata?.repoName, "ESP-ADF");
      assert.strictEqual(error.metadata?.detail, "timeout");
    });
  });
});
