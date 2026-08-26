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
  STREAM_CHAR_LIMIT,
  buildTaskFailedChatPrompt,
  openTaskFailedOutputInAiChat,
  truncateFromEnd,
} from "../../common/error/openTaskFailedChat";
import { known } from "../../common/error/knownError";
import { resolveKnownErrorDescriptor } from "../../common/error/resolve";
import { ErrorCode } from "../../common/error/types";

suite("task failed AI chat", () => {
  suite("buildTaskFailedChatPrompt", () => {
    test("includes stdout, stderr, and exit code", () => {
      const prompt = buildTaskFailedChatPrompt({
        stdout: "ninja: error: missing file",
        stderr: "CMake Error",
        exitCode: 1,
      });
      assert.ok(
        prompt.startsWith(
          "Help me fix the issue in the output of this ESP-IDF task."
        )
      );
      assert.ok(prompt.includes("Exit code: 1"));
      assert.ok(prompt.includes("ninja: error: missing file"));
      assert.ok(prompt.includes("CMake Error"));
    });

    test("truncates long streams from the end", () => {
      const head = "UNIQUE_HEAD_MARKER";
      const tail = "UNIQUE_TAIL_MARKER";
      const stdout = `${head}${"x".repeat(STREAM_CHAR_LIMIT)}${tail}`;
      const prompt = buildTaskFailedChatPrompt({
        stdout,
        stderr: "",
        exitCode: 2,
      });
      assert.ok(prompt.includes("...[truncated]"));
      assert.ok(prompt.includes(tail));
      assert.ok(!prompt.includes(head));
    });

    test("empty streams still produce a usable prompt", () => {
      const prompt = buildTaskFailedChatPrompt({});
      assert.ok(prompt.includes("Exit code: (unknown)"));
      assert.ok(prompt.includes("stdout:"));
      assert.ok(prompt.includes("stderr:"));
    });
  });

  suite("truncateFromEnd", () => {
    test("returns short text unchanged", () => {
      assert.strictEqual(truncateFromEnd("ok", 10), "ok");
    });
  });

  suite("resolveKnownErrorDescriptor", () => {
    test("appends Ask AI to Fix for TaskFailedWithOutput", () => {
      const descriptor = resolveKnownErrorDescriptor(
        known(ErrorCode.TaskFailedWithOutput, {
          stdout: "fail",
          stderr: "",
          exitCode: 1,
        })
      );
      assert.deepStrictEqual(
        descriptor?.actions.map((action) => action.label),
        ["View Terminal Output", "Ask AI to Fix"]
      );
    });
  });

  suite("openTaskFailedOutputInAiChat", () => {
    let originalExecuteCommand: typeof vscode.commands.executeCommand;
    let originalAppName: string;
    let commandCalls: { command: string; args: unknown[] }[];

    setup(() => {
      originalExecuteCommand = vscode.commands.executeCommand;
      originalAppName = vscode.env.appName;
      commandCalls = [];
      Object.defineProperty(vscode.commands, "executeCommand", {
        configurable: true,
        value: async (command: string, ...args: unknown[]) => {
          commandCalls.push({ command, args });
          return undefined;
        },
      });
    });

    teardown(() => {
      Object.defineProperty(vscode.commands, "executeCommand", {
        configurable: true,
        value: originalExecuteCommand,
      });
      Object.defineProperty(vscode.env, "appName", {
        value: originalAppName,
        configurable: true,
        writable: true,
      });
    });

    test("invokes composer.startComposerPrompt in Cursor", async () => {
      Object.defineProperty(vscode.env, "appName", {
        value: "Cursor",
        configurable: true,
        writable: true,
      });
      const metadata = {
        stdout: "ninja failed",
        stderr: "",
        exitCode: 1,
      };
      await openTaskFailedOutputInAiChat(metadata);
      assert.strictEqual(commandCalls.length, 1);
      assert.strictEqual(
        commandCalls[0].command,
        "composer.startComposerPrompt"
      );
      assert.strictEqual(
        commandCalls[0].args[0],
        buildTaskFailedChatPrompt(metadata)
      );
    });

    test("invokes Copilot Chat commands in Visual Studio Code", async () => {
      Object.defineProperty(vscode.env, "appName", {
        value: "Visual Studio Code",
        configurable: true,
        writable: true,
      });
      await openTaskFailedOutputInAiChat({
        stdout: "ok",
        stderr: "",
        exitCode: 1,
      });
      assert.strictEqual(
        commandCalls[0]?.command,
        "workbench.action.chat.newChat"
      );
      assert.strictEqual(
        commandCalls[1]?.command,
        "workbench.action.chat.open"
      );
      const openArgs = commandCalls[1].args[0] as {
        query: string;
        isPartialQuery: boolean;
      };
      assert.strictEqual(openArgs.isPartialQuery, false);
      assert.ok(openArgs.query.includes("Help me fix the issue"));
    });
  });
});
