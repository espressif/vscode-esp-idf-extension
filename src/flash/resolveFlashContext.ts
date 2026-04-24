/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { WorkspaceFolder } from "vscode";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";

const ALLOWED_PARTITIONS = new Set([
  "app",
  "bootloader",
  "partition-table",
]);

export function normalizePartitionToUse(
  raw: ESP.BuildType | string | undefined
): ESP.BuildType | undefined {
  if (!raw || !ALLOWED_PARTITIONS.has(String(raw))) {
    return undefined;
  }
  return raw as ESP.BuildType;
}

export function resolveFlashTypeForTask(
  wsFolder: WorkspaceFolder | undefined,
  explicit?: ESP.FlashType
): ESP.FlashType {
  if (explicit) {
    return explicit;
  }
  return readParameter("idf.flashType", wsFolder) as ESP.FlashType;
}

export function resolvePartitionToUseForTask(
  wsFolder: WorkspaceFolder | undefined,
  explicit?: ESP.BuildType
): ESP.BuildType | undefined {
  if (explicit !== undefined) {
    return explicit;
  }
  const raw = readParameter(
    "idf.flashPartitionToUse",
    wsFolder
  ) as ESP.BuildType;
  return normalizePartitionToUse(raw);
}
