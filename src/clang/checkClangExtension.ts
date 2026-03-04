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
import { commands, extensions, l10n, window } from "vscode";
import { Logger } from "../logger/logger";

export const CLANGD_EXTENSION_ID = "llvm-vs-code-extensions.vscode-clangd";

/**
 * Check if the Clang extension is installed.
 * @returns {boolean} `true` if Clang extension is installed, `false` otherwise.
 */
export function isClangdExtensionInstalled(): boolean {
  const clangdExtension = extensions.getExtension(CLANGD_EXTENSION_ID);
  return !!clangdExtension;
}

/**
 * Call Clang extension's command to restart the language server.
 * This can be useful after `building` to ensure the language server picks up the new settings.
 */
export async function restartClangdLanguageServer() {
  const isClangExtensionPresent = isClangdExtensionInstalled();

  if (isClangExtensionPresent) {
    try {
      await commands.executeCommand("clangd.restart");
    } catch (error) {
      Logger.error(
        "Failed to restart clangd language server",
        error,
        "checkClangExtension restartClangLanguageServer"
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

    const installAction = await window.showInformationMessage(
      message,
      { modal: false },
      { title: l10n.t("Install clangd") },
      { title: l10n.t("Not now") }
    );

    const installOption = { title: l10n.t("Install clangd") };

    if (installAction && installAction === installOption) {
      try {
        await commands.executeCommand(
          "workbench.extensions.installExtension",
          CLANGD_EXTENSION_ID
        );

        // Show success message
        await window.showInformationMessage(
          l10n.t(
            "clangd extension installed successfully! Please reload the window to activate it."
          )
        );

        // Offer to reload the window
        const reloadAction = await window.showInformationMessage(
          l10n.t(
            "Would you like to reload the window to activate the clangd extension?"
          ),
          { modal: false },
          { title: l10n.t("Reload") },
          { title: l10n.t("Later") }
        );

        const reloadOption = { title: l10n.t("Reload") };

        if (reloadAction && reloadAction === reloadOption) {
          await commands.executeCommand("workbench.action.reloadWindow");
        }
      } catch (error) {
        Logger.error(
          "Failed to install clangd extension",
          error,
          "checkAndPromptForClangdExtension"
        );

        await window.showErrorMessage(
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
