/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

export function buildUartEraseFlashArgs(
  esptoolScriptPath: string,
  port: string
): string[] {
  return [esptoolScriptPath, "-p", port, "erase_flash"];
}
