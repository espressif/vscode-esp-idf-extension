import * as vscode from "vscode";
import { Logger } from "./logger/logger";
import { OutputChannel } from "./logger/outputChannel";

export async function asyncRemoveEspIdfSettings() {
  const config = vscode.workspace.getConfiguration();
  const settingsToDelete: string[] = [];

  // Helper function to recursively find idf settings
  function findIdfSettings(obj: any, prefix: string = "") {
    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (fullPath.startsWith("idf.") || fullPath.startsWith("esp.")) {
          settingsToDelete.push(fullPath);
        }
        findIdfSettings(obj[key], fullPath);
      });
    }
  }

  // Get all settings directly from configuration
  const allSettings = config.inspect("");

  // Check values saved in each scope using a simple loop
  const scopeValues = [
    allSettings?.globalValue,
    allSettings?.workspaceValue,
    allSettings?.workspaceFolderValue,
  ];

  for (const value of scopeValues) {
    if (value) {
      findIdfSettings(value);
    }
  }

  if (settingsToDelete.length === 0) {
    vscode.window.showInformationMessage(
      vscode.l10n.t("No ESP-IDF settings found to remove.")
    );
    return;
  }

  // Filter out any duplicate paths
  const uniqueSettingsToDelete = [...new Set(settingsToDelete)];

  // Ask user for confirmation
  const message = vscode.l10n.t(
    "Are you sure you want to remove all ESP-IDF settings? This will delete all idf.* configurations."
  );
  const result = await vscode.window.showWarningMessage(
    message,
    {
      modal: true,
      detail: vscode.l10n.t(
        "{0} settings will be removed.",
        uniqueSettingsToDelete.length
      ),
    },
    vscode.l10n.t("Yes"),
    vscode.l10n.t("No")
  );

  if (result !== vscode.l10n.t("Yes")) {
    return;
  }

  // Helper function to remove setting from a specific scope
  async function removeSettingFromScope(
    setting: string,
    target: vscode.ConfigurationTarget,
    inspectionValue: any,
    scopeDescription: string
  ) {
    try {
      if (inspectionValue !== undefined) {
        await config.update(setting, undefined, target);
        OutputChannel.appendLine(
          vscode.l10n.t(`Removed ${scopeDescription} setting: {0}`, setting)
        );
      }
    } catch (e) {
      // Silently continue if we can't modify settings for this scope
    }
  }

  try {
    const message = vscode.l10n.t("Starting ESP-IDF settings cleanup...");
    OutputChannel.appendLineAndShow(message);
    Logger.info(message);

    const scopeConfigs = [
      {
        target: vscode.ConfigurationTarget.Global,
        property: "globalValue",
        description: "global",
      },
      {
        target: vscode.ConfigurationTarget.Workspace,
        property: "workspaceValue",
        description: "workspace",
      },
      {
        target: vscode.ConfigurationTarget.WorkspaceFolder,
        property: "workspaceFolderValue",
        description: "workspace folder",
      },
    ];

    // Delete each setting
    for (const setting of uniqueSettingsToDelete) {
      try {
        const inspection = config.inspect(setting);

        // Try to remove from each scope
        for (const { target, property, description } of scopeConfigs) {
          await removeSettingFromScope(
            setting,
            target,
            inspection?.[property],
            description
          );
        }
      } catch (settingError) {
        OutputChannel.appendLine(
          vscode.l10n.t(
            "Warning: Could not fully remove setting {0}: {1}",
            setting,
            settingError.message
          )
        );
      }
    }

    OutputChannel.appendLineAndShow(
      vscode.l10n.t("ESP-IDF settings removed successfully.")
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      vscode.l10n.t("Failed to remove settings: {0}"),
      errorMessage
    );
    OutputChannel.appendLineAndShow(vscode.l10n.t("Error: {0}"), errorMessage);
    Logger.error(errorMessage, error, "extension removeEspIdfSettings");
  }
}
