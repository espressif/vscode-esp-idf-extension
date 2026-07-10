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
import { ESP } from "../../config";
import { ImageViewPanel } from "../imageViewPanel";
import {
  DebugVariableCommandContext,
  isImageVariableCommandContextReady,
  isVariableCommandContextReady,
} from "./variableCommandContext";
import {
  fileNotFound,
  invalidConfiguration,
  noWorkspaceOpen,
} from "../../common/error/knownError";
import { debugErrorPresentation } from "../debugErrorPresentation";

function registerDebugCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, { outputChannel: "Debug" });
}

export function registerHexViewCommands(
  context: ExtensionContext,
  hexViewProvider: HexViewProvider
) {
  registerDebugCommand(
    context,
    "espIdf.hexView.deleteElement",
    (item: HexTreeItem) => {
      return PreCheck.perform([openFolderCheck], async () => {
        hexViewProvider.removeElement(item.element);
      });
    }
  );

  registerDebugCommand(
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

  registerDebugCommand(
    context,
    "espIdf.viewAsHex",
    (debugContext: DebugVariableCommandContext) => {
      return PreCheck.perform([openFolderCheck], async () => {
        if (!isVariableCommandContextReady(debugContext)) {
          return;
        }
        const value = debugContext.variable.value;
        const numericValue = parseInt(value, 10);
        if (isNaN(numericValue)) {
          throw invalidConfiguration(
            "espIdf.viewAsHex.variableValue",
            debugErrorPresentation.invalidConfiguration
          );
        }
        hexViewProvider.addElement(debugContext.variable.name, numericValue);
      });
    }
  );
}

export function registerImageViewCommands(context: ExtensionContext) {
  registerDebugCommand(
    context,
    "espIdf.viewVariableAsImage",
    (debugContext: DebugVariableCommandContext) => {
      return PreCheck.perform([openFolderCheck], async () => {
        if (!isImageVariableCommandContextReady(debugContext)) {
          return;
        }
        ImageViewPanel.show(context.extensionPath);
        await ImageViewPanel.handleVariableAsImage(debugContext);
      });
    }
  );

  registerDebugCommand(context, "espIdf.openImageViewer", () => {
    return PreCheck.perform([openFolderCheck], () => {
      ImageViewPanel.show(context.extensionPath);
    });
  });

  registerDebugCommand(context, "espIdf.loadImageFromFile", async () => {
    return PreCheck.perform([openFolderCheck], async () => {
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
    throw invalidConfiguration(
      "launch.configurations",
      debugErrorPresentation.invalidConfiguration
    );
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
      throw invalidConfiguration(
        "launch.configurations",
        debugErrorPresentation.invalidConfiguration
      );
    }
    await debug.startDebugging(workspaceFolder, resolvedConf);
    return;
  }
  throw invalidConfiguration(
    "launch.configurations",
    debugErrorPresentation.invalidConfiguration
  );
}

export function registerEspIdfDebugCommand(
  context: ExtensionContext,
  cdtDebugProvider: CDTDebugConfigurationProvider
) {
  registerDebugCommand(context, "espIdf.debug", async () => {
    await PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const workspaceFolder =
        ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!workspaceFolder) {
        throw noWorkspaceOpen(debugErrorPresentation.noWorkspaceOpen);
      }
      const launchJsonPath = join(
        workspaceFolder.uri.fsPath,
        ".vscode",
        "launch.json"
      );
      if (!(await pathExists(launchJsonPath))) {
        throw fileNotFound(launchJsonPath, debugErrorPresentation.fileNotFound);
      }
      await startFirstGdbTargetConfiguration(workspaceFolder, cdtDebugProvider);
    });
  });
}
