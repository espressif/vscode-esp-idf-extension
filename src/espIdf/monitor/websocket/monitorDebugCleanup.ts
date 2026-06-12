/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { debug, Disposable } from "vscode";

const pendingCleanups = new Map<string, Disposable>();

/**
 * Runs `onEnd` when the debug session with `sessionId` terminates.
 * Re-registers for the same sessionId replace any previous listener so duplicates do not stack.
 */
export function registerWsMonitorDebugCleanup(
  sessionId: string,
  onEnd: () => void
): void {
  const previous = pendingCleanups.get(sessionId);
  if (previous) {
    previous.dispose();
    pendingCleanups.delete(sessionId);
  }
  const sub = debug.onDidTerminateDebugSession((session) => {
    if (session.configuration.sessionID === sessionId) {
      try {
        onEnd();
      } finally {
        sub.dispose();
        pendingCleanups.delete(sessionId);
      }
    }
  });
  pendingCleanups.set(sessionId, sub);
}
