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
  flasherArgsMissing,
  isKnownError,
  noSerialPort,
  partitionCustomTableNotEnabled,
  partitionInvalidSizeFormat,
  partitionPopulateFailed,
  partitionSdkconfigRequired,
  partitionTableFilenameEmpty,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import { parsePartitionSize } from "../../espIdf/partition-table/partitionReader";
import { partitionTableCommandErrorMapping } from "../../espIdf/partition-table/errorMapping";

suite("Partition table command errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping includes Build action for PartitionSdkconfigRequired", () => {
      const descriptor = resolveKnownErrorDescriptor(
        partitionSdkconfigRequired(),
        partitionTableCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Partition Table");
      assert.strictEqual(descriptor?.actions[0].label, "Build");
    });

    test("command mapping includes SDK Configuration action for PartitionCustomTableNotEnabled", () => {
      const descriptor = resolveKnownErrorDescriptor(
        partitionCustomTableNotEnabled(),
        partitionTableCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(
        descriptor?.actions[0].label,
        "Open SDK Configuration"
      );
    });

    test("command mapping applies partition-specific wording for NoSerialPort", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          noSerialPort("esp32"),
          partitionTableCommandErrorMapping
        ),
        "No serial port found for current IDF_TARGET: esp32"
      );
    });

    test("command mapping includes Build action for FlasherArgsMissing", () => {
      const descriptor = resolveKnownErrorDescriptor(
        flasherArgsMissing(),
        partitionTableCommandErrorMapping
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.actions[0].label, "Build");
    });
  });

  suite("parsePartitionSize", () => {
    test("throws partitionInvalidSizeFormat for invalid size", () => {
      assert.throws(
        () => parsePartitionSize("invalid"),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.PartitionInvalidSizeFormat &&
          error.metadata?.size === "invalid"
      );
    });

    test("converts kilobyte partition size to hex", () => {
      assert.strictEqual(parsePartitionSize("24K"), "0x6000");
    });
  });

  suite("known error factories", () => {
    test("partitionTableFilenameEmpty maps to registry code", () => {
      const error = partitionTableFilenameEmpty();
      assert.ok(isKnownError(error));
      assert.strictEqual(error.code, ErrorCode.PartitionTableFilenameEmpty);
    });

    test("partitionPopulateFailed includes detail metadata", () => {
      const error = partitionPopulateFailed("spawn failed");
      assert.ok(isKnownError(error));
      assert.strictEqual(error.metadata?.detail, "spawn failed");
    });
  });
});
