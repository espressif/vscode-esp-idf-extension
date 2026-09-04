/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Uri, WorkspaceFolder } from "vscode";
import { ESP } from "../config";
import { readParameter } from "../configuration/idf";
import { flashTypeNotSelected } from "../common/error/knownError";
import { selectFlashMethod } from "./selectFlashMethod";

const ALLOWED_PARTITIONS = new Set(["app", "bootloader", "partition-table"]);

let selectFlashMethodForTests:
  | ((workspaceFolder: WorkspaceFolder) => Promise<ESP.FlashType | undefined>)
  | undefined;

export function setSelectFlashMethodForTests(
  fn:
    | ((workspaceFolder: WorkspaceFolder) => Promise<ESP.FlashType | undefined>)
    | undefined
): void {
  selectFlashMethodForTests = fn;
}

export function isValidFlashType(value: unknown): value is ESP.FlashType {
  const raw = typeof value === "string" ? value.trim() : "";
  return Object.values(ESP.FlashType).includes(raw as ESP.FlashType);
}

function readConfiguredFlashType(
  wsFolder: WorkspaceFolder | Uri | undefined
): ESP.FlashType | undefined {
  const fromConfig = readParameter("idf.flashType", wsFolder);
  const raw = typeof fromConfig === "string" ? fromConfig.trim() : "";
  return isValidFlashType(raw) ? raw : undefined;
}

export function normalizePartitionToUse(
  raw: ESP.BuildType | string | undefined
): ESP.BuildType | undefined {
  if (!raw || !ALLOWED_PARTITIONS.has(String(raw))) {
    return undefined;
  }
  return raw as ESP.BuildType;
}

export function resolveFlashTypeForTask(
  wsFolder: WorkspaceFolder | Uri | undefined,
  explicit?: ESP.FlashType
): ESP.FlashType {
  if (isValidFlashType(explicit)) {
    return explicit;
  }
  return readConfiguredFlashType(wsFolder) ?? ("" as ESP.FlashType);
}

export async function ensureFlashTypeForTask(
  wsFolder: WorkspaceFolder,
  explicit?: ESP.FlashType
): Promise<ESP.FlashType> {
  if (isValidFlashType(explicit)) {
    return explicit;
  }

  const configured = readConfiguredFlashType(wsFolder);
  if (configured) {
    return configured;
  }

  const prompt = selectFlashMethodForTests ?? selectFlashMethod;
  const selected = await prompt(wsFolder);
  if (isValidFlashType(selected)) {
    return selected;
  }

  throw flashTypeNotSelected();
}

export function resolvePartitionToUseForTask(
  wsFolder: WorkspaceFolder | Uri | undefined,
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
