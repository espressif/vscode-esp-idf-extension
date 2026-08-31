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

import { commands, env, window } from "vscode";
import { Logger } from "../logger";

export const STREAM_CHAR_LIMIT = 20_000;
const TRUNCATION_MARKER = "\n...[truncated]\n";

export function truncateFromEnd(
  text: string,
  maxChars: number = STREAM_CHAR_LIMIT
): string {
  if (text.length <= maxChars) {
    return text;
  }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length);
  return `${TRUNCATION_MARKER}${text.slice(text.length - keep)}`;
}

function streamFromMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export function appendBoundedFromEnd(
  existing: string,
  chunk: string,
  maxChars: number = STREAM_CHAR_LIMIT
): string {
  return truncateFromEnd(`${existing}${chunk}`, maxChars);
}

export function buildTaskFailedChatPrompt(
  metadata?: Record<string, unknown>
): string {
  const exitCode = metadata?.exitCode ?? "(unknown)";
  const stdout = truncateFromEnd(streamFromMetadata(metadata, "stdout"));
  const stderr = truncateFromEnd(streamFromMetadata(metadata, "stderr"));
  const phase =
    typeof metadata?.phase === "string" ? metadata.phase : undefined;
  const lines = [
    "Help me fix the issue in the output of this ESP-IDF task.",
    "",
    `Exit code: ${exitCode}`,
  ];
  if (phase) {
    lines.push(`Phase: ${phase}`);
  }
  lines.push(
    "",
    "stdout:",
    "```",
    stdout,
    "```",
    "",
    "stderr:",
    "```",
    stderr,
    "```"
  );
  return lines.join("\n");
}

function isCursor(): boolean {
  return env.appName === "Cursor";
}

function isVisualStudioCode(): boolean {
  return env.appName === "Visual Studio Code";
}

async function copyPromptToClipboard(prompt: string): Promise<void> {
  await env.clipboard.writeText(prompt);
  await window.showInformationMessage(
    "AI Chat is unavailable. The task output was copied to the clipboard."
  );
}

async function openVsCodeChat(prompt: string): Promise<void> {
  try {
    await commands.executeCommand("workbench.action.chat.newChat");
  } catch {
    // Hosts without Copilot Chat omit this command.
  }
  await commands.executeCommand("workbench.action.chat.open", {
    query: prompt,
    isPartialQuery: false,
  });
}

async function openCursorComposer(prompt: string): Promise<void> {
  try {
    await commands.executeCommand("composer.startComposerPrompt", prompt);
    return;
  } catch {
    // String argument may be unsupported; try object forms.
  }
  try {
    await commands.executeCommand("composer.startComposerPrompt", {
      query: prompt,
    });
    return;
  } catch {
    await commands.executeCommand("composer.startComposerPrompt", {
      text: prompt,
    });
  }
}

export async function openTaskFailedOutputInAiChat(
  metadata?: Record<string, unknown>
): Promise<void> {
  const prompt = buildTaskFailedChatPrompt(metadata);
  try {
    if (isCursor()) {
      await openCursorComposer(prompt);
      return;
    }
    if (isVisualStudioCode()) {
      await openVsCodeChat(prompt);
      return;
    }
    try {
      await openVsCodeChat(prompt);
    } catch {
      await openCursorComposer(prompt);
    }
  } catch (error) {
    Logger.error(
      "Failed to open AI Chat with the ESP-IDF task output",
      error instanceof Error ? error : new Error(String(error)),
      "openTaskFailedOutputInAiChat",
      undefined,
      false
    );
    try {
      await copyPromptToClipboard(prompt);
    } catch (clipboardError) {
      Logger.error(
        "Failed to copy the ESP-IDF task output to the clipboard",
        clipboardError instanceof Error
          ? clipboardError
          : new Error(String(clipboardError)),
        "openTaskFailedOutputInAiChat",
        undefined,
        false
      );
    }
  }
}
