/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 12th February 2026 2:10:56 pm
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
  Disposable,
  ExtensionContext,
  extensions,
  l10n,
  RelativePattern,
  Uri,
  window,
  workspace,
} from "vscode";
import { Logger } from "../logger/logger";
import { readParameter } from "../idfConfiguration";

export const CLANGD_EXTENSION_ID = "llvm-vs-code-extensions.vscode-clangd";

/**
 * Check if the Clang extension is installed.
 * @returns {boolean} `true` if Clangd extension is installed, `false` otherwise.
 */
export function isClangdExtensionInstalled(): boolean {
  const clangdExtension = extensions.getExtension(CLANGD_EXTENSION_ID);
  return !!clangdExtension;
}

/**
 * Check if the Clang extension is installed and active.
 * @returns {boolean} `true` if Clangd extension is installed and active, `false` otherwise.
 */
export function isClangdExtensionActive(): boolean {
  const clangdExtension = extensions.getExtension(CLANGD_EXTENSION_ID);
  return !!clangdExtension && clangdExtension.isActive;
}

/**
 * Call Clang extension's command to restart the language server.
 * This can be useful after `building` to ensure the language server picks up the new settings.
 */
export async function restartClangdLanguageServer() {
  const isClangExtensionPresent = isClangdExtensionActive();

  if (isClangExtensionPresent) {
    try {
      await commands.executeCommand("clangd.restart");
    } catch (error) {
      Logger.error(
        "Failed to restart clangd language server",
        error,
        "checkClangExtension restartClangdLanguageServer"
      );
    }
  }
}

/**
 * Checks if the clangd extension is installed and prompts the user to install it if not.
 * This is specifically for VS Code fork users (like Cursor, VSCodium, etc.) to ensure they have the best C/C++ development experience.
 */
export async function checkAndPromptForClangdExtension() {
  const isClangExtensionPresent = isClangdExtensionInstalled();

  if (!isClangExtensionPresent) {
    Logger.info("clangd extension not found - prompting user to install");

    const message = l10n.t(
      "For the best C/C++ development experience in this editor, we recommend installing the clangd extension. This provides enhanced IntelliSense, code completion, and error detection."
    );

    const installOption = { title: l10n.t("Install clangd") };
    const installAction = await window.showInformationMessage(
      message,
      { modal: false },
      installOption,
      { title: l10n.t("Not now") }
    );

    if (installAction && installAction === installOption) {
      try {
        await commands.executeCommand(
          "workbench.extensions.installExtension",
          CLANGD_EXTENSION_ID
        );

        // Show success message
        const reloadOption = { title: l10n.t("Reload") };
        const reloadAction = await window.showInformationMessage(
          l10n.t(
            "clangd extension installed successfully! Please reload the window to activate it."
          ),
          reloadOption
        );
        if (reloadAction && reloadAction === reloadOption) {
          await commands.executeCommand("workbench.action.reloadWindow");
        }
      } catch (error) {
        Logger.error(
          "Failed to install clangd extension",
          error,
          "checkAndPromptForClangdExtension"
        );

        window.showErrorMessage(
          l10n.t(
            "Failed to install clangd extension. You can install it manually from the Extensions marketplace."
          )
        );
      }
    } else {
      Logger.info("User chose not to install clangd extension");
    }
  } else {
    Logger.info("clangd extension is already installed");
  }
}

/** Tracks the compile_commands.json watcher and its event subscriptions so they can be disposed when handleCompileCommandsUpdate is called again. */
const compileCommandsWatcherDisposables: Disposable[] = [];

/**
 * Trigger a Clangd restart language server if compile_commands.json is updated.
 * This ensures that the language server picks up the new compile commands and provides accurate IntelliSense and error checking.
 * Disposes any existing watcher and event subscriptions before creating new ones (e.g. when workspace or config changes).
 * @param {vscode.Uri} workspaceUri - The workspace URI to watch for compile_commands.json.
 * @param {ExtensionContext} context - The extension context for registering teardown on deactivation.
 */
export async function handleCompileCommandsUpdate(
  workspaceUri: Uri,
  context: ExtensionContext
) {
  while (compileCommandsWatcherDisposables.length) {
    let d = compileCommandsWatcherDisposables.pop();
    if (d) {
      const idx = context.subscriptions.indexOf(d);
      if (idx >= 0) {
        context.subscriptions.splice(idx, 1);
      }
      d.dispose();
    }
  }
  const buildDirPath = readParameter("idf.buildPath", workspaceUri) as string;

  if (!buildDirPath) {
    return;
  }

  const relativePattern = new RelativePattern(
    buildDirPath,
    "**/compile_commands.json"
  );
  const compileCommandsJsonWatcher = workspace.createFileSystemWatcher(
    relativePattern,
    false,
    false,
    true
  );

  let restartDebounceTimer: NodeJS.Timeout | null = null;
  const restartClangdOnUpdate = (_uri: Uri) => {
    if (restartDebounceTimer) {
      clearTimeout(restartDebounceTimer);
    }
    restartDebounceTimer = setTimeout(() => {
      Logger.info(
        "compile_commands.json updated - restarting clangd language server"
      );
      restartClangdLanguageServer();
    }, 500);
  };

  compileCommandsWatcherDisposables.push(
    compileCommandsJsonWatcher,
    compileCommandsJsonWatcher.onDidCreate(restartClangdOnUpdate),
    compileCommandsJsonWatcher.onDidChange(restartClangdOnUpdate)
  );
  context.subscriptions.push(...compileCommandsWatcherDisposables);
}
