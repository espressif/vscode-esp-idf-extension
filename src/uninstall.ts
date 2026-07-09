import * as vscode from "vscode";
import { Logger } from "./common/logger";
import { OutputChannel } from "./common/outputChannel";
import { registerIDFCommand } from "./common/registerCommand";
import { espIdfSettingsRemovalFailed } from "./common/error/knownError";
import { CommandErrorMapping, ErrorCode } from "./common/error/types";
import { ErrorSeverity } from "./common/customNotifications";

const removeEspIdfSettingsErrorMapping: CommandErrorMapping = {
  [ErrorCode.EspIdfSettingsRemovalFailed]: {
    severity: ErrorSeverity.Error,
    userMessage: "Failed to remove ESP-IDF settings: {detail}",
    logMessage: "ESP-IDF settings removal failed: {detail}.",
    actions: [],
    outputChannel: "ESP-IDF",
  },
};

export function registerRemoveEspIdfSettingsCommand(
  context: vscode.ExtensionContext
) {
  registerIDFCommand(
    context,
    "espIdf.removeEspIdfSettings",
    asyncRemoveEspIdfSettings,
    removeEspIdfSettingsErrorMapping
  );
}

export async function asyncRemoveEspIdfSettings() {
  const config = vscode.workspace.getConfiguration();
  const settingsToDelete: string[] = [];

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

  const allSettings = config.inspect("");

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

  const uniqueSettingsToDelete = [...new Set(settingsToDelete)];

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
          vscode.l10n.t("Removed ${0} setting: {1}", scopeDescription, setting)
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

    for (const setting of uniqueSettingsToDelete) {
      try {
        const inspection = config.inspect(setting);

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
    Logger.error(errorMessage, error, "extension removeEspIdfSettings");
    throw espIdfSettingsRemovalFailed(errorMessage);
  }
}
