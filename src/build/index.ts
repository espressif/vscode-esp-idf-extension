/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 30th March 2026 2:41:05 pm
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

import { openFolderCheck } from "../common/PreCheck";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { ESP } from "../config";
import { readParameter } from "../idfConfiguration";
import { ExtensionContext } from "vscode";
import { buildMain } from "./buildMain";
import { registerIDFCommand } from "../common/registerCommand";

export function registerBuildCommands(context: ExtensionContext) {
  registerIDFCommand(context, "espIdf.buildDevice", () => build());
  registerIDFCommand(context, "espIdf.buildDFU", () =>
    build(ESP.FlashType.DFU)
  );
  registerIDFCommand(context, "espIdf.buildApp", () =>
    build(undefined, ESP.BuildType.App)
  );
  registerIDFCommand(context, "espIdf.buildBootloader", () =>
    build(undefined, ESP.BuildType.Bootloader)
  );
  registerIDFCommand(context, "espIdf.buildPartitionTable", () =>
    build(undefined, ESP.BuildType.PartitionTable)
  );
}

export async function build(
  flashType?: ESP.FlashType,
  buildType?: ESP.BuildType
): Promise<void> {
  await withProgressWrapper(
    [openFolderCheck],
    "ESP-IDF: Building project",
    async (_progress, cancelToken, wsFolder) => {
      let resolvedFlashType = flashType;
      if (!resolvedFlashType) {
        const fromConfig = readParameter("idf.flashType", wsFolder);
        const raw =
          typeof fromConfig === "string" ? fromConfig.trim() : "";
        resolvedFlashType = Object.values(ESP.FlashType).includes(
          raw as ESP.FlashType
        )
          ? (raw as ESP.FlashType)
          : ESP.FlashType.UART;
      }
      await buildMain(wsFolder.uri, cancelToken, resolvedFlashType, buildType);
    }
  );
}
