/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { commands } from "vscode";
import { ErrorPresentation } from "./types";

export const buildErrorPresentation = {
  invalidConfiguration: {
    actions: [
      {
        label: "Open Settings",
        execute: () =>
          commands.executeCommand(
            "workbench.action.openSettings",
            "idf.buildPath"
          ),
      },
    ],
  },
} satisfies Record<string, ErrorPresentation>;
