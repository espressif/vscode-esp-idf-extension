/*
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

import {
  debug,
  DebugConfiguration,
  ExtensionContext,
  env,
  l10n,
  window,
  workspace,
} from "vscode";
import { join } from "path";
import { pathExists } from "fs-extra";
import { HexTreeItem, HexViewProvider } from "../hexViewProvider";
import { CDTDebugConfigurationProvider } from "../debugConfProvider";
import { registerIDFCommand } from "../../common/registerCommand";
import { openFolderCheck, PreCheck, webIdeCheck } from "../../common/PreCheck";
import { Logger } from "../../logger/logger";
import { ESP } from "../../config";
import { ImageViewPanel } from "../imageViewPanel";
import {
  DebugVariableCommandContext,
  isImageVariableCommandContextReady,
  isVariableCommandContextReady,
  notifyCommandError,
} from "./variableCommandContext";

export function registerHexViewCommands(
  context: ExtensionContext,
  hexViewProvider: HexViewProvider
) {
  registerIDFCommand(
    context,
    "espIdf.hexView.deleteElement",
    (item: HexTreeItem) => {
      return PreCheck.perform([openFolderCheck], async () => {
        hexViewProvider.removeElement(item.element);
      });
    }
  );

  registerIDFCommand(
    context,
    "espIdf.hexView.copyValue",
    (item: HexTreeItem) => {
      return PreCheck.perform([openFolderCheck], async () => {
        env.clipboard.writeText(
          `${item.element.name} ${item.description?.toString()}`
        );
        window.showInformationMessage(
          `Copied ${item.element.name} to clipboard`
        );
      });
    }
  );

  registerIDFCommand(
    context,
    "espIdf.viewAsHex",
    (debugContext: DebugVariableCommandContext) => {
      return PreCheck.perform([openFolderCheck], async () => {
        if (!isVariableCommandContextReady(debugContext)) {
          return;
        }
        try {
          const value = debugContext.variable.value;
          const numericValue = parseInt(value, 10);
          if (isNaN(numericValue)) {
            Logger.errorNotify(
              l10n.t("The value {value} is not a number.", { value }),
              new Error("Value is not a number"),
              "extension espIdf.viewAsHex"
            );
            return;
          }
          hexViewProvider.addElement(debugContext.variable.name, numericValue);
        } catch (e) {
          notifyCommandError(e, "extension espIdf.viewAsHex");
        }
      });
    }
  );
}

export function registerImageViewCommands(context: ExtensionContext) {
  registerIDFCommand(
    context,
    "espIdf.viewVariableAsImage",
    (debugContext: DebugVariableCommandContext) => {
      return PreCheck.perform([openFolderCheck], async () => {
        if (!isImageVariableCommandContextReady(debugContext)) {
          return;
        }
        try {
          ImageViewPanel.show(context.extensionPath);
          ImageViewPanel.handleVariableAsImage(debugContext);
        } catch (e) {
          notifyCommandError(e, "extension espIdf.viewVariableAsImage");
        }
      });
    }
  );

  registerIDFCommand(context, "espIdf.openImageViewer", () => {
    return PreCheck.perform([openFolderCheck], () => {
      ImageViewPanel.show(context.extensionPath);
    });
  });

  registerIDFCommand(context, "espIdf.loadImageFromFile", async () => {
    return PreCheck.perform([openFolderCheck], async () => {
      try {
        const fileUri = await window.showOpenDialog({
          canSelectMany: false,
          openLabel: "Select LVGL C file with image data",
          filters: {
            "C files": ["c", "h"],
            "All files": ["*"],
          },
        });

        if (fileUri?.[0]) {
          await ImageViewPanel.loadImageFromFile(
            context.extensionPath,
            fileUri[0].fsPath
          );
        }
      } catch (error) {
        notifyCommandError(error, "extension espIdf.loadImageFromFile");
      }
    });
  });
}

async function startFirstGdbTargetConfiguration(
  workspaceFolder: NonNullable<
    ReturnType<typeof ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder>
  >,
  cdtDebugProvider: CDTDebugConfigurationProvider
): Promise<void> {
  const config = workspace.getConfiguration("launch", workspaceFolder);
  const configurations = config.get(
    "configurations"
  ) as DebugConfiguration[];
  if (!configurations?.length) {
    await window.showInformationMessage(
      l10n.t(
        `No gdbtarget configuration found in launch.json.\nDelete launch.json and use the 'ESP-IDF: Add vscode Configuration Folder' command.`
      )
    );
    return;
  }
  for (const conf of configurations) {
    if (conf.type !== "gdbtarget") {
      continue;
    }
    const resolvedConf = await cdtDebugProvider.resolveDebugConfiguration(
      workspaceFolder,
      conf
    );
    if (!resolvedConf) {
      await window.showErrorMessage(
        l10n.t(
          "Could not resolve the gdbtarget debug configuration. Check the ESP-IDF output for details."
        )
      );
      return;
    }
    await debug.startDebugging(workspaceFolder, resolvedConf);
    return;
  }
  await window.showInformationMessage(
    l10n.t(
      `No gdbtarget configuration found in launch.json.\nDelete launch.json and use the 'ESP-IDF: Add vscode Configuration Folder' command.`
    )
  );
}

export function registerEspIdfDebugCommand(
  context: ExtensionContext,
  cdtDebugProvider: CDTDebugConfigurationProvider
) {
  registerIDFCommand(context, "espIdf.debug", async () => {
    PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const workspaceFolder =
        ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!workspaceFolder) {
        await window.showInformationMessage(
          l10n.t("No workspace folder selected.")
        );
        return;
      }
      const launchJsonPath = join(
        workspaceFolder.uri.fsPath,
        ".vscode",
        "launch.json"
      );
      if (!(await pathExists(launchJsonPath))) {
        await window.showInformationMessage(
          l10n.t(
            `No launch.json found.\nUse the 'ESP-IDF: Add vscode Configuration Folder' command.`
          )
        );
        return;
      }
      await startFirstGdbTargetConfiguration(workspaceFolder, cdtDebugProvider);
    });
  });
}
