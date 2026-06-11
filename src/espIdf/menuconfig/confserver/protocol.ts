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

export function resetValueRequest(ids: string[]): string {
  return `${JSON.stringify({ version: 3, reset: ids })}\n`;
}

export function saveValueRequest(filePath: string): string {
  return `${JSON.stringify({ version: 2, save: filePath })}\n`;
}

export function loadValueRequest(filePath: string): string {
  return `${JSON.stringify({ version: 2, load: filePath })}\n`;
}
