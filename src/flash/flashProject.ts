/*
 * Project: ESP-IDF VSCode Extension
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { commands, env, UIKind } from "vscode";
import { openFolderCheck } from "../common/PreCheck";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { IDFWebCommandKeys } from "../cmdTreeView/cmdStore";
import { ESP } from "../config";
import { OutputChannel } from "../logger/outputChannel";
import {
  resolveFlashTypeForTask,
  resolvePartitionToUseForTask,
} from "./resolveFlashContext";
import { startFlashing } from "./startFlashing";

export async function flash(
  encryptPartitions: boolean = false,
  flashType?: ESP.FlashType,
  partitionToUse?: ESP.BuildType
) {
  await withProgressWrapper(
    [openFolderCheck],
    "ESP-IDF: Flashing project",
    async (_progress, cancelToken, wsFolder) => {
      const resolvedFlashType = resolveFlashTypeForTask(wsFolder, flashType);
      const resolvedPartition = resolvePartitionToUseForTask(
        wsFolder,
        partitionToUse
      );
      if (
        await startFlashing(
          wsFolder!.uri,
          cancelToken,
          resolvedFlashType,
          encryptPartitions,
          resolvedPartition
        )
      ) {
        OutputChannel.appendLine(
          "Flash has finished. You can monitor your device with 'ESP-IDF: Monitor Device'"
        );
      }
    },
    {
      afterPreCheckProceed: async () => {
        if (env.uiKind === UIKind.Web) {
          commands.executeCommand(IDFWebCommandKeys.Flash);
          return false;
        }
        return true;
      },
    }
  );
}
