/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import * as vscode from "vscode";
import { isKnownError } from "../../common/error/knownError";
import { ErrorCode } from "../../common/error/types";
import { OutputCapturingExecution } from "../../taskManager/customExecution";
import {
  collectExecutions,
  getTaskProcessExecution,
  getWorkspaceFolderForTask,
  TaskManager,
  throwCapturedTaskFailure,
  type IdfTaskExecution,
} from "../../taskManager/taskManager";

suite("taskManager helpers", () => {
  suite("collectExecutions", () => {
    test("filters undefined and preserves defined executions", () => {
      const a = {} as IdfTaskExecution;
      const b = {} as IdfTaskExecution;
      const result = collectExecutions(undefined, a, undefined, b);
      assert.deepStrictEqual(result, [a, b]);
    });

    test("empty call yields empty array", () => {
      assert.deepStrictEqual(collectExecutions(), []);
    });

    test("all undefined yields empty array", () => {
      assert.deepStrictEqual(collectExecutions(undefined, undefined), []);
    });
  });

  suite("throwCapturedTaskFailure", () => {
    teardown(() => {
      TaskManager.clearTaskResults();
    });

    test("does not throw when there are no recorded results", async () => {
      TaskManager.clearTaskResults();
      await throwCapturedTaskFailure();
    });

    test("does not throw when recorded results succeeded", async () => {
      TaskManager.recordTaskResult({
        taskId: "idf-build-task",
        taskName: "ESP-IDF Build",
        output: {
          success: true,
          stderr: "noise",
          stdout: "",
          exitCode: 0,
        },
      });
      await throwCapturedTaskFailure();
    });

    test("throws KnownError with stderr metadata when task failed with stderr", async () => {
      TaskManager.recordTaskResult({
        taskId: "idf-build-task",
        taskName: "ESP-IDF Build",
        output: {
          success: false,
          stderr: "  cmake error  ",
          stdout: "",
          exitCode: 1,
        },
      });
      await assert.rejects(
        throwCapturedTaskFailure(),
        (e: unknown) =>
          isKnownError(e) &&
          e.code === ErrorCode.TaskFailedWithOutput &&
          e.metadata?.stderr === "  cmake error  "
      );
    });

    test("throws KnownError with stdout metadata when stderr is empty", async () => {
      TaskManager.recordTaskResult({
        taskId: "idf-build-task",
        taskName: "ESP-IDF Build",
        output: {
          success: false,
          stderr: "   ",
          stdout: "ninja failed",
          exitCode: 1,
        },
      });
      await assert.rejects(
        throwCapturedTaskFailure(),
        (e: unknown) =>
          isKnownError(e) &&
          e.code === ErrorCode.TaskFailedWithOutput &&
          e.metadata?.stdout === "ninja failed"
      );
    });

    test("throws KnownError with process invocation metadata", async () => {
      TaskManager.recordTaskResult({
        taskId: "idf-flash-task",
        taskName: "ESP-IDF Flash",
        processCommand: "/usr/bin/python3",
        processArgs: [
          "/opt/esp/idf/components/esptool_py/esptool/esptool.py",
          "-p",
          "/dev/ttyUSB0",
          "write_flash",
        ],
        output: {
          success: false,
          stderr: "flash failed",
          stdout: "",
          exitCode: 1,
        },
      });
      await assert.rejects(
        throwCapturedTaskFailure(),
        (e: unknown) =>
          isKnownError(e) &&
          e.code === ErrorCode.TaskFailedWithOutput &&
          e.metadata?.processCommand === "python3" &&
          e.metadata?.taskName === "ESP-IDF Flash" &&
          e.metadata?.script === "esptool.py" &&
          typeof e.metadata?.args === "string" &&
          (e.metadata.args as string).includes("esptool.py") &&
          (e.metadata.args as string).includes("[redacted]") &&
          !(e.metadata.args as string).includes("ttyUSB0")
      );
    });

    test("throws KnownError with exit code when stdout and stderr are blank", async () => {
      TaskManager.recordTaskResult({
        taskId: "idf-build-task",
        taskName: "ESP-IDF Build",
        output: {
          success: false,
          stderr: "",
          stdout: "  ",
          exitCode: 7,
        },
      });
      await assert.rejects(
        throwCapturedTaskFailure(),
        (e: unknown) =>
          isKnownError(e) &&
          e.code === ErrorCode.TaskFailedWithOutput &&
          e.metadata?.exitCode === 7 &&
          e.metadata?.stdout === "  " &&
          e.metadata?.stderr === ""
      );
    });

    test("keeps large captured output out of the error message", async () => {
      const stdout = "ninja: build stopped\n".repeat(2000);
      TaskManager.recordTaskResult({
        taskId: "idf-build-task",
        taskName: "ESP-IDF Build",
        processCommand: "ninja",
        processArgs: [],
        output: {
          success: false,
          stderr: "",
          stdout,
          exitCode: 1,
        },
      });
      await assert.rejects(
        throwCapturedTaskFailure(),
        (e: unknown) =>
          isKnownError(e) &&
          e.metadata?.stdout === stdout &&
          e.message.length < 500 &&
          e.message.includes(`[${stdout.length} chars]`) &&
          !e.message.includes("ninja: build stopped") &&
          !(e.stack ?? "").includes("ninja: build stopped")
      );
    });
  });
});

suite("getTaskProcessExecution", () => {
  test("returns OutputCapturingExecution with command and args", () => {
    const exec = getTaskProcessExecution("echo", ["hi"], "/tmp", {});
    assert.ok(exec instanceof OutputCapturingExecution);
    assert.strictEqual(exec.command, "echo");
    assert.deepStrictEqual(exec.args, ["hi"]);
  });
});

suite("TaskManager", () => {
  teardown(() => {
    TaskManager.disposeListeners();
    TaskManager.clearTaskResults();
  });

  test("runTasks resolves immediately when queue is empty", async () => {
    await assert.doesNotReject(TaskManager.runTasks());
  });

  test("runTasksWithBoolean returns true when queue is empty", async () => {
    const ok = await TaskManager.runTasksWithBoolean();
    assert.strictEqual(ok, true);
  });

  test("clearTaskResults leaves getTaskResults empty", () => {
    TaskManager.clearTaskResults();
    assert.deepStrictEqual(TaskManager.getTaskResults(), []);
  });

  test("getTaskResult returns undefined for an unknown taskId", () => {
    assert.strictEqual(TaskManager.getTaskResult("missing"), undefined);
  });

  test("getTaskResult returns the last recorded result for a taskId", () => {
    const output = {
      stdout: "ok",
      stderr: "",
      exitCode: 0,
      success: true,
    };
    TaskManager.recordTaskResult({
      taskId: "idf-flash-task",
      taskName: "ESP-IDF Flash",
      output,
    });
    const result = TaskManager.getTaskResult("idf-flash-task");
    assert.strictEqual(result?.taskName, "ESP-IDF Flash");
    assert.deepStrictEqual(result?.output, output);
  });

  test("disposeListeners is safe when already clean", () => {
    TaskManager.disposeListeners();
    assert.doesNotThrow(() => TaskManager.disposeListeners());
  });
});

suite("getWorkspaceFolderForTask", () => {
  test("resolves folder for a URI inside the opened workspace", function () {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      // Requires an open workspace folder: getWorkspaceFolderForTask needs a workspace for nested URIs.
      this.skip();
    }
    const nested = vscode.Uri.joinPath(folder.uri, "CMakeLists.txt");
    const resolved = getWorkspaceFolderForTask(nested);
    assert.strictEqual(resolved?.uri.toString(), folder.uri.toString());
  });
});
