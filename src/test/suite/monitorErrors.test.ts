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
  fileNotFound,
  idfTaskInProgress,
  monitorWsPortInUse,
  monitorWsPortNotConfigured,
  noPortSelected,
} from "../../common/error/knownError";
import {
  resolveKnownErrorDescriptor,
  resolveKnownErrorUserMessage,
} from "../../common/error/resolve";
const monitorPresentation = {
  taskInProgress: {
    severity: ErrorSeverity.Warning,
    userMessage:
      "Wait for ESP-IDF {taskName} to finish before starting the monitor.",
    logMessage: "Attempted to start monitor while {taskName} is in progress.",
    actions: [],
    outputChannel: "Monitor",
  },
  noPortSelected: {
    userMessage: "Select a serial port before starting the monitor.",
    logMessage: "No serial port selected for monitor.",
    actions: [{ label: "Select Port", execute: async () => undefined }],
    outputChannel: "Monitor",
  },
  fileNotFound: {
    userMessage:
      "Project ELF file not found at {filePath}. Build your project first.",
    logMessage: "Monitor blocked: project ELF file not found: {filePath}.",
    actions: [{ label: "Build", execute: async () => undefined }],
    outputChannel: "Monitor",
  },
  wsPortNotConfigured: {
    severity: ErrorSeverity.Error,
    userMessage: "WebSocket port (idf.wssPort) is not configured.",
    logMessage: "WebSocket monitor port (idf.wssPort) is not configured.",
    actions: [{ label: "Open Settings", execute: async () => undefined }],
    outputChannel: "Monitor",
  },
};

suite("monitor errors", () => {
  suite("resolveKnownErrorUserMessage", () => {
    test("command mapping applies Monitor output channel for NoPortSelected", () => {
      const descriptor = resolveKnownErrorDescriptor(
        noPortSelected(monitorPresentation.noPortSelected)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Monitor");
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          noPortSelected(monitorPresentation.noPortSelected)
        ),
        "Select a serial port before starting the monitor."
      );
      assert.strictEqual(descriptor?.actions[0].label, "Select Port");
    });

    test("command mapping applies monitor-specific wording for IdfTaskInProgress", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          idfTaskInProgress("build", monitorPresentation.taskInProgress)
        ),
        "Wait for ESP-IDF build to finish before starting the monitor."
      );
    });

    test("command mapping includes Build action for missing ELF file", () => {
      const descriptor = resolveKnownErrorDescriptor(
        fileNotFound("/build/project.elf", monitorPresentation.fileNotFound)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Monitor");
      assert.strictEqual(
        descriptor?.userMessage,
        "Project ELF file not found at /build/project.elf. Build your project first."
      );
      assert.strictEqual(descriptor?.actions[0].label, "Build");
    });

    test("command mapping includes Open Settings action for MonitorWsPortNotConfigured", () => {
      const descriptor = resolveKnownErrorDescriptor(
        monitorWsPortNotConfigured(monitorPresentation.wsPortNotConfigured)
      );
      assert.ok(descriptor);
      assert.strictEqual(descriptor?.outputChannel, "Monitor");
      assert.strictEqual(descriptor?.actions[0].label, "Open Settings");
    });

    test("command mapping applies wsPort interpolation for MonitorWsPortInUse", () => {
      assert.strictEqual(
        resolveKnownErrorUserMessage(
          monitorWsPortInUse(8266)
        ),
        "Port 8266 is not available. Change idf.wssPort to use a different port."
      );
    });
  });
});
