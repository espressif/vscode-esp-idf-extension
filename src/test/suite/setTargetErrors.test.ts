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
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as vscode from "vscode";
import {
  idfTaskInProgress,
  invalidIdfTarget,
  isKnownError,
  known,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { getTargetsFromEspIdf } from "../../espIdf/setTarget/getTargets";
import { setTargetErrorPresentation } from "../../espIdf/setTarget/setTargetErrorPresentation";

const testWorkspaceUri = vscode.Uri.file("/test/workspace");

suite("setTarget errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("presentation applies for InvalidIdfTarget", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          invalidIdfTarget(
            "esp999",
            ["esp32", "esp32s3"],
            setTargetErrorPresentation.invalidIdfTarget
          )
        ),
        '"esp999" is not a supported IDF target. Supported targets: esp32, esp32s3.'
      );
    });

    test("presentation applies Set Target output channel for ChildProcessFailed", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(
          ErrorCode.ChildProcessFailed,
          { detail: "set-target failed" },
          setTargetErrorPresentation.childProcessFailed
        )
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Set Target");
      assert.strictEqual(
        descriptor?.userMessage,
        "Set target failed. Check the output for details."
      );
      assert.strictEqual(descriptor?.actions.length, 2);
      assert.strictEqual(descriptor?.actions[0].label, "View Output");
      assert.strictEqual(descriptor?.actions[1].label, "Ask AI to Fix");
    });

    test("presentation applies set-target wording for IdfTaskInProgress", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          idfTaskInProgress(
            "set target",
            setTargetErrorPresentation.idfTaskInProgress
          )
        ),
        "Wait for ESP-IDF set target to finish."
      );
    });
  });

  suite("getTargetsFromEspIdf", () => {
    test("throws fileNotFound when constants.py is absent", async () => {
      const idfPath = mkdtempSync(join(tmpdir(), "idf-missing-constants-"));

      await assert.rejects(
        () => getTargetsFromEspIdf(idfPath),
        (error: unknown) =>
          isKnownError(error) && error.code === ErrorCode.FILE_NOT_FOUND
      );
    });
  });
});
