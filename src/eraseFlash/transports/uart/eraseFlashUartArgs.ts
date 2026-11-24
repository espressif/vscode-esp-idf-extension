/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import {
  esptoolProgramArgs,
  formatEsptoolArgs,
} from "../../../flash/shared/esptool/esptoolCli";

export function buildUartEraseFlashArgs(
  esptoolScriptPath: string,
  port: string,
  hyphenCli: boolean = false,
  useModule: boolean = false
): string[] {
  return formatEsptoolArgs(
    [
      ...esptoolProgramArgs(esptoolScriptPath, useModule),
      "-p",
      port,
      "erase_flash",
    ],
    hyphenCli
  );
}
