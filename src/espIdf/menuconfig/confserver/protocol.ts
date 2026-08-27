/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Menu, menuType } from "../Menu";

function getIntegerValue(updatedValue: Menu): number {
  if (updatedValue.value !== "") {
    return Number(updatedValue.value);
  }
  const hasRange =
    Array.isArray(updatedValue.range) && updatedValue.range.length > 0;
  return hasRange ? Number(updatedValue.range[0]) : 0;
}

function getSetPayload(updatedValue: Menu): { [id: string]: any } {
  if (updatedValue.type === menuType.choice) {
    return { [updatedValue.value]: true };
  }
  if (updatedValue.type === menuType.string) {
    return { [updatedValue.id]: String(updatedValue.value ?? "") };
  }
  if (updatedValue.type === menuType.hex) {
    return { [updatedValue.id]: String(updatedValue.value || "0") };
  }
  if (updatedValue.type === menuType.int) {
    return { [updatedValue.id]: getIntegerValue(updatedValue) };
  }
  return { [updatedValue.id]: updatedValue.value };
}

export function setValueRequest(updatedValue: Menu): string {
  return `${JSON.stringify({ version: 2, set: getSetPayload(updatedValue) })}\n`;
}

export function configIdFromConfserverRequest(
  request: string | undefined
): string | undefined {
  if (!request?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(request.trim()) as {
      set?: Record<string, unknown>;
      reset?: unknown;
    };
    if (parsed.set && typeof parsed.set === "object") {
      const [firstKey] = Object.keys(parsed.set);
      if (firstKey) {
        return firstKey;
      }
    }
    if (Array.isArray(parsed.reset)) {
      const firstId = parsed.reset.find(
        (id): id is string => typeof id === "string" && id.length > 0
      );
      if (firstId) {
        return firstId;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const CONFIG_ID_IN_DETAIL = /\bCONFIG_[A-Za-z0-9_]+\b/;

export function configIdFromProtocolErrorDetail(
  detail: string | undefined
): string | undefined {
  if (!detail) {
    return undefined;
  }
  return detail.match(CONFIG_ID_IN_DETAIL)?.[0];
}

export function configIdFromProtocolError(
  request: string | undefined,
  detail: string | undefined
): string | undefined {
  return (
    configIdFromConfserverRequest(request) ??
    configIdFromProtocolErrorDetail(detail)
  );
}

export function resetValueRequest(ids: string[]): string {
  return `${JSON.stringify({ version: 3, reset: ids })}\n`;
}

export function saveValueRequest(filePath: string): string {
  return `${JSON.stringify({ version: 2, save: filePath })}\n`;
}

export function loadValueRequest(filePath: string): string {
  return `${JSON.stringify({ version: 2, load: filePath })}\n`;
}

const CONFSERVER_INFORMATIONAL_STDERR = new RegExp(
  [
    "Server running, waiting for requests on stdin\\.\\.",
    "Saving config to",
    "Loading config from",
    "The following config symbol\\(s\\) were not visible so were not updated",
    "WARNING:",
    "Reset .* to default values?",
    "Set [A-Za-z0-9_]+",
  ].join("|")
);

export function isConfserverInformationalStderr(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  return CONFSERVER_INFORMATIONAL_STDERR.test(trimmed);
}
