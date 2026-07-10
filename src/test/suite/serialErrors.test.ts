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
import * as vscode from "vscode";
import {
  isKnownError,
  noSerialPort,
  noSerialPortsAvailable,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";
import {
  SerialPort,
  setSerialPortModuleTestHooks,
} from "../../espIdf/serial/serialPort";
import { serialErrorPresentation } from "../../espIdf/serial/serialErrorPresentation";
import {
  resetIdfConfigurationSource,
  setIdfConfigurationSource,
} from "../../configuration/idfConfigurationSource";

const testWorkspaceUri = vscode.Uri.file("/test/workspace");

function createFakeIdfSource(getValues: Record<string, unknown> = {}) {
  return {
    getScoped(_section: string, _scope: unknown, key: string) {
      return Object.prototype.hasOwnProperty.call(getValues, key)
        ? getValues[key]
        : undefined;
    },
    inspectGlobal() {
      return undefined;
    },
    updateScoped: async () => undefined,
    updateGlobal: async () => undefined,
    refreshConfiguration: () => undefined,
  };
}

suite("serial errors", () => {
  teardown(() => {
    setSerialPortModuleTestHooks(undefined);
    resetIdfConfigurationSource();
  });

  suite("resolveKnownErrorUserMessage", () => {
    test("presentation applies for noSerialPortsAvailable", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          noSerialPortsAvailable(serialErrorPresentation.noSerialPortsAvailable)
        ),
        "No serial ports found."
      );
    });

    test("presentation adds Detect action for NoSerialPort", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noSerialPort("esp32", serialErrorPresentation.noSerialPort)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Serial port");
      assert.strictEqual(descriptor?.actions.length, 1);
      assert.strictEqual(descriptor?.actions[0].label, "Detect");
    });

    test("presentation adds Detect action for NoSerialPortsAvailable", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noSerialPortsAvailable(serialErrorPresentation.noSerialPortsAvailable)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Serial port");
      assert.strictEqual(descriptor?.actions.length, 1);
      assert.strictEqual(descriptor?.actions[0].label, "Detect");
    });
  });

  suite("SerialPort", () => {
    test("getListArray throws noSerialPortsAvailable when OS list is empty", async () => {
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.enableSerialPortChipIdRequest": false,
        })
      );
      setSerialPortModuleTestHooks({
        listSerialPorts: async () => [],
      });

      await assert.rejects(
        () => SerialPort.shared().getListArray(testWorkspaceUri, true),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.NoSerialPortsAvailable
      );
    });

    test("detectDefaultPort throws noSerialPort when no matching device is found", async () => {
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.serialPortDetectionTimeout": 1,
        })
      );
      setSerialPortModuleTestHooks({
        getCurrentIdfConfiguration: () => ({ IDF_PATH: "/idf" }),
        getExpectedIdfTarget: async () => "esp32",
        resolveEsptoolInvocation: async () => ({
          pythonPath: "/usr/bin/python3",
          esptoolScriptPath: "/idf/components/esptool_py/esptool/esptool.py",
        }),
        spawn: async () =>
          Buffer.from(
            "Serial port /dev/ttyUSB0\nfailed to connect\n",
            "utf8"
          ),
      });

      await assert.rejects(
        () => SerialPort.detectDefaultPort(testWorkspaceUri),
        (error: unknown) =>
          isKnownError(error) &&
          error.code === ErrorCode.NoSerialPort &&
          error.metadata?.idfTarget === "esp32"
      );
    });

    test("getListArray probes chip ID when setting is unset", async () => {
      setIdfConfigurationSource(createFakeIdfSource());
      setSerialPortModuleTestHooks({
        getCurrentIdfConfiguration: () => ({ IDF_PATH: "/idf" }),
        listSerialPorts: async () => [
          { path: "/dev/ttyUSB0", manufacturer: "Espressif" },
        ],
        resolveEsptoolInvocation: async () => ({
          pythonPath: "/usr/bin/python3",
          esptoolScriptPath: "/idf/components/esptool_py/esptool/esptool.py",
        }),
        spawn: async () =>
          Buffer.from("Chip is ESP32-S3 (QFN56) (revision v0.2)\n", "utf8"),
      });

      const ports = await SerialPort.shared().getListArray(testWorkspaceUri);
      assert.strictEqual(ports.length, 1);
      assert.strictEqual(ports[0].chipType, "ESP32-S3 (QFN56) (revision v0.2)");
    });

    test("getListArray skips chip ID probing when setting is false", async () => {
      setIdfConfigurationSource(
        createFakeIdfSource({
          "idf.enableSerialPortChipIdRequest": false,
        })
      );
      let spawnCalled = false;
      setSerialPortModuleTestHooks({
        listSerialPorts: async () => [
          { path: "/dev/ttyUSB0", manufacturer: "Espressif" },
        ],
        spawn: async () => {
          spawnCalled = true;
          return Buffer.from("", "utf8");
        },
      });

      const ports = await SerialPort.shared().getListArray(testWorkspaceUri);
      assert.strictEqual(ports.length, 1);
      assert.strictEqual(ports[0].chipType, undefined);
      assert.strictEqual(spawnCalled, false);
    });
  });
});
