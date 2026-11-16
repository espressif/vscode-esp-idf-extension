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
  commands,
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
import { INITIAL_GDBTARGET_CONFIG } from "../debugConfProvider";
import {
  GDBSTUB_UART_CONNECTION_MODE,
  OPENOCD_JTAG_CONNECTION_MODE,
  isSdkconfigOptionEnabled,
  selectDebugLaunchConfiguration,
} from "../gdbstub/debugConfig";
import { getConfigValueFromSDKConfig } from "../../configuration/workspace";
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
  invalidConfiguration,
  noWorkspaceOpen,
} from "../../common/error/knownError";
import { debugErrorPresentation } from "../debugErrorPresentation";
import { configureProjectForRuntimeGdbStub } from "../../configuration/gdbstub/configureProject";
import {
  ensureRuntimeGdbStubLaunchJson,
  setDebugConnectionMode,
} from "../gdbstub/launchJson";
import { Logger } from "../../common/logger";
import {
  checkIsProjectCmakeLists,
  createVscodeFolder,
} from "../../newProject/utils";

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

async function notifyRuntimeGdbStubReady(
  alreadyConfigured: boolean
): Promise<void> {
  const message = alreadyConfigured
    ? l10n.t(
        "Runtime GDB Stub is already configured. Build and flash the project, then start debugging."
      )
    : l10n.t(
        'Runtime GDB Stub is configured. Build and flash the project, then start debugging. launch.json connectionMode is "Gdbstub-UART"; set it to "OpenOCD-JTAG" to use JTAG again.'
      );
  const buildAndFlash = l10n.t("Build and Flash");
  Logger.info(message);
  const choice = await window.showInformationMessage(message, buildAndFlash);
  if (choice !== buildAndFlash) {
    return;
  }
  await commands.executeCommand("espIdf.buildDevice");
  await commands.executeCommand("espIdf.flashDevice");
}

export function registerEspIdfDebugCommand(context: ExtensionContext) {
  registerDebugCommand(context, "espIdf.debug", async () => {
    await PreCheck.perform([webIdeCheck, openFolderCheck], async () => {
      const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!workspaceFolder) {
        throw noWorkspaceOpen(debugErrorPresentation.noWorkspaceOpen);
      }
      const configurations = workspace
        .getConfiguration("launch", workspaceFolder)
        .get<DebugConfiguration[]>("configurations");
      const selected = selectDebugLaunchConfiguration(configurations);
      const started = await debug.startDebugging(
        workspaceFolder,
        selected
          ? ({ ...selected, type: "gdbtarget" } as DebugConfiguration)
          : { ...INITIAL_GDBTARGET_CONFIG }
      );
      if (started) {
        // startDebugging waits for a break before showing this view, and that
        // path only checks the primary sidebar if the view was moved.
        await commands.executeCommand("workbench.view.debug");
      }
    });
  });

  registerDebugCommand(context, "espIdf.configureRuntimeGdbStub", async () => {
    await PreCheck.perform([openFolderCheck], async () => {
      const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
      if (!workspaceFolder) {
        throw noWorkspaceOpen(debugErrorPresentation.noWorkspaceOpen);
      }
      if (!checkIsProjectCmakeLists(workspaceFolder.uri.fsPath)) {
        Logger.infoNotify(
          l10n.t("The current directory is not an ESP-IDF project.")
        );
        return;
      }
      const result = await configureProjectForRuntimeGdbStub(
        workspaceFolder.uri
      );
      if (result === "cancelled") {
        return;
      }
      const launchJsonPath = join(
        workspaceFolder.uri.fsPath,
        ".vscode",
        "launch.json"
      );
      if (!(await pathExists(launchJsonPath))) {
        await createVscodeFolder(context.extensionPath, workspaceFolder.uri);
      }
      const launchChanged = await ensureRuntimeGdbStubLaunchJson(
        workspaceFolder.uri
      );
      await notifyRuntimeGdbStubReady(result === "unchanged" && !launchChanged);
    });
  });

  registerDebugCommand(
    context,
    "espIdf.selectDebugConnectionMode",
    async () => {
      await PreCheck.perform([openFolderCheck], async () => {
        const workspaceFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
        if (!workspaceFolder) {
          throw noWorkspaceOpen(debugErrorPresentation.noWorkspaceOpen);
        }
        const configurations = workspace
          .getConfiguration("launch", workspaceFolder)
          .get<DebugConfiguration[]>("configurations");
        const currentMode =
          selectDebugLaunchConfiguration(configurations)?.connectionMode ??
          OPENOCD_JTAG_CONNECTION_MODE;
        const picked = await window.showQuickPick(
          [
            {
              label: OPENOCD_JTAG_CONNECTION_MODE,
              description: l10n.t("JTAG debug with OpenOCD"),
              detail:
                currentMode === OPENOCD_JTAG_CONNECTION_MODE
                  ? l10n.t("Current")
                  : undefined,
              mode: OPENOCD_JTAG_CONNECTION_MODE,
            },
            {
              label: GDBSTUB_UART_CONNECTION_MODE,
              description: l10n.t("Runtime GDB stub over UART"),
              detail:
                currentMode === GDBSTUB_UART_CONNECTION_MODE
                  ? l10n.t("Current")
                  : undefined,
              mode: GDBSTUB_UART_CONNECTION_MODE,
            },
          ],
          { placeHolder: l10n.t("Select Debug Connection Mode") }
        );
        if (!picked) {
          return;
        }
        if (picked.mode === GDBSTUB_UART_CONNECTION_MODE) {
          let runtimeEnabled = false;
          try {
            runtimeEnabled = isSdkconfigOptionEnabled(
              await getConfigValueFromSDKConfig(
                "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME",
                workspaceFolder.uri
              )
            );
          } catch {
            runtimeEnabled = false;
          }
          if (!runtimeEnabled) {
            const configure = l10n.t("Configure Project");
            const choice = await window.showInformationMessage(
              l10n.t(
                "Runtime GDB Stub is not configured for this project. Run ESP-IDF: Configure Project for Runtime GDB Stub, then build and flash before debugging over UART."
              ),
              configure
            );
            if (choice === configure) {
              await commands.executeCommand("espIdf.configureRuntimeGdbStub");
            }
            return;
          }
        }
        const launchJsonPath = join(
          workspaceFolder.uri.fsPath,
          ".vscode",
          "launch.json"
        );
        if (!(await pathExists(launchJsonPath))) {
          await createVscodeFolder(context.extensionPath, workspaceFolder.uri);
        }
        await setDebugConnectionMode(workspaceFolder.uri, picked.mode);
        window.showInformationMessage(
          l10n.t("Debug connection mode set to {mode}.", { mode: picked.mode })
        );
      });
    }
  );
}
