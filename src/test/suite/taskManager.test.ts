/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import * as assert from "assert";
import * as vscode from "vscode";
import { OutputCapturingExecution } from "../../taskManager/customExecution";
import {
  collectExecutions,
  getTaskProcessExecution,
  getWorkspaceFolderForTask,
  TaskManager,
  throwCapturedTaskFailure,
  type IdfTaskExecution,
} from "../../taskManager";

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
    test("skips undefined and executions without getOutput", async () => {
      await throwCapturedTaskFailure([
        undefined,
        {} as IdfTaskExecution,
      ]);
    });

    test("does not throw when getOutput reports success", async () => {
      await throwCapturedTaskFailure([
        {
          getOutput: async () => ({ success: true, stderr: "noise" }),
        } as unknown as IdfTaskExecution,
      ]);
    });

    test("throws stderr when task failed with stderr", async () => {
      await assert.rejects(
        throwCapturedTaskFailure([
          {
            getOutput: async () => ({
              success: false,
              stderr: "  cmake error  ",
            }),
          } as unknown as IdfTaskExecution,
        ]),
        (e: unknown) => e === "  cmake error  "
      );
    });

    test("throws stdout when stderr is empty", async () => {
      await assert.rejects(
        throwCapturedTaskFailure([
          {
            getOutput: async () => ({
              success: false,
              stderr: "   ",
              stdout: "ninja failed",
            }),
          } as unknown as IdfTaskExecution,
        ]),
        (e: unknown) => e === "ninja failed"
      );
    });

    test("throws exit code when stdout and stderr are blank", async () => {
      await assert.rejects(
        throwCapturedTaskFailure([
          {
            getOutput: async () => ({
              success: false,
              stderr: "",
              stdout: "  ",
              exitCode: 7,
            }),
          } as unknown as IdfTaskExecution,
        ]),
        (e: Error) => e.message === "Task exited with code 7"
      );
    });

    test("ignores falsy executionOutput", async () => {
      await throwCapturedTaskFailure([
        {
          getOutput: async () =>
            undefined as unknown as {
              success: boolean;
              stderr?: string;
              stdout?: string;
              exitCode?: number;
            },
        } as unknown as IdfTaskExecution,
      ]);
    });
  });
});

suite("getTaskProcessExecution", () => {
  test("returns OutputCapturingExecution when captureOutput is true", () => {
    const exec = getTaskProcessExecution(
      "echo",
      ["hi"],
      "/tmp",
      {},
      true
    );
    assert.ok(exec instanceof OutputCapturingExecution);
  });

  test("returns ProcessExecution when captureOutput is false or omitted", () => {
    const withoutFlag = getTaskProcessExecution("echo", ["a"], "/tmp", {});
    assert.ok(withoutFlag instanceof vscode.ProcessExecution);

    const explicitFalse = getTaskProcessExecution(
      "echo",
      ["b"],
      "/tmp",
      {},
      false
    );
    assert.ok(explicitFalse instanceof vscode.ProcessExecution);
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

  test("disposeListeners is safe when already clean", () => {
    TaskManager.disposeListeners();
    assert.doesNotThrow(() => TaskManager.disposeListeners());
  });
});

suite("getWorkspaceFolderForTask", () => {
  test("resolves folder for a URI inside the opened workspace", () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      assert.fail("Expected an open workspace folder for this test");
    }
    const nested = vscode.Uri.joinPath(folder.uri, "CMakeLists.txt");
    const resolved = getWorkspaceFolderForTask(nested);
    assert.strictEqual(resolved?.uri.toString(), folder.uri.toString());
  });
});
