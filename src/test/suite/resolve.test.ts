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
  alreadyBuilding,
  idfTaskInProgress,
  invalidIdfVersion,
  IdfTaskName,
  sectionBinNotAccessible,
} from "../../common/error/knownError";
import {
  interpolate,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { ErrorSeverity } from "../../common/customNotifications";

suite("error resolve", () => {
  suite("interpolate", () => {
    test("replaces placeholders from metadata", () => {
      assert.strictEqual(
        interpolate("Flash binary file {binFilePath} missing", {
          binFilePath: "boot.bin",
        }),
        "Flash binary file boot.bin missing"
      );
    });
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("returns registry text for AlreadyBuilding", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(alreadyBuilding()),
        "Wait for ESP-IDF build to finish"
      );
    });

    test("interpolates metadata for SectionBinNotAccessible", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(sectionBinNotAccessible("missing.bin")),
        "Flash binary file missing.bin doesn't exist or can't be accessed!"
      );
    });

    test("interpolates taskName for IdfTaskInProgress", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(idfTaskInProgress(IdfTaskName.Build)),
        "Wait for ESP-IDF build to finish."
      );
    });

    test("interpolates idfPath for InvalidIdfVersion", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(invalidIdfVersion("/esp/idf")),
        "Failed to read ESP-IDF version from /esp/idf."
      );
    });

    test("command override wins over registry default", () => {
      const message = resolveKnownErrorUserMessage(alreadyBuilding(), {
        [ErrorCode.AlreadyBuilding]: {
          severity: ErrorSeverity.Warning,
          userMessage: "Custom build busy message",
          logMessage: "custom log",
          actions: [],
        },
      });
      assert.strictEqual(message, "Custom build busy message");
    });
  });
});
