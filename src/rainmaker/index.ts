/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 12th May 2020 3:28:36 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { ExtensionContext, l10n, Uri, window } from "vscode";
import { registerIDFCommand } from "../common/registerCommand";
import { RainmakerAPIClient } from "./client";
import { Logger } from "../common/logger";
import { PromptUserToLogin } from "./view/login";
import { RainmakerOAuthManager } from "./oauth";
import { withProgressWrapper } from "../common/withProgressWrapper";
import { RMakerItem } from "./view/item";
import { RainmakerDeviceParamStructure } from "./client/model";
import { ESPRainMakerTreeDataProvider } from "./view";
import { rainmakerCommandErrorMapping } from "./errorMapping";

function registerRainmakerCommand(
  context: ExtensionContext,
  name: string,
  callback: (...args: any[]) => any
) {
  registerIDFCommand(context, name, callback, rainmakerCommandErrorMapping);
}

export function registerRainMakerCommands(context: ExtensionContext) {
  const rainMakerTreeDataProvider = new ESPRainMakerTreeDataProvider();
  context.subscriptions.push(
    rainMakerTreeDataProvider.registerDataProviderForTree("espRainmaker")
  );

  registerRainmakerCommand(context, "esp.rainmaker.backend.connect", async () => {
    if (RainmakerAPIClient.isLoggedIn()) {
      Logger.infoNotify(l10n.t("Already logged-in, please sign-out first"));
      return;
    }
    await withProgressWrapper(
      [],
      l10n.t("ESP-IDF: Please wait checking with Rainmaker Cloud"),
      async (_progress, _cancelToken) => {
        const accountDetails = await PromptUserToLogin();
        if (!accountDetails) {
          return;
        }

        if (accountDetails.provider) {
          RainmakerOAuthManager.openExternalOAuthURL(accountDetails.provider);
          return;
        }

        if (!accountDetails.username || !accountDetails.password) {
          return;
        }
        await RainmakerAPIClient.login(
          accountDetails.username,
          accountDetails.password
        );
        await rainMakerTreeDataProvider.refresh();
        Logger.infoNotify("Rainmaker Cloud Linking Success!");
      }
    );
  });

  registerIDFCommand(context, "esp.rainmaker.backend.logout", async () => {
    const shallLogout = await window.showWarningMessage(
      l10n.t("Would you like to unlink your ESP Rainmaker cloud account?"),
      { modal: true },
      { title: "Yes" },
      { title: "Cancel", isCloseAffordance: true }
    );
    if (!shallLogout || shallLogout.title === "Cancel") {
      return;
    }
    RainmakerAPIClient.logout();
    rainMakerTreeDataProvider.refresh();
  });

  registerIDFCommand(context, "esp.rainmaker.backend.sync", async () => {
    rainMakerTreeDataProvider.refresh();
  });

  registerRainmakerCommand(
    context,
    "esp.rainmaker.backend.remove_node",
    async (item: RMakerItem) => {
      if (!item) {
        return;
      }
      const shallDelete = await window.showWarningMessage(
        l10n.t(
          "Would you like to delete this node from your ESP Rainmaker account?"
        ),
        { modal: true },
        { title: "Yes" },
        { title: "Cancel", isCloseAffordance: true }
      );
      if (!shallDelete || shallDelete.title === "Cancel") {
        return;
      }

      await withProgressWrapper(
        [],
        l10n.t("ESP-IDF: Deleting node from your rainmaker account"),
        async (_progress, _cancelToken) => {
          if (!item.id) {
            return;
          }
          await RainmakerAPIClient.deleteNode(item.id);
          rainMakerTreeDataProvider.refresh();
        }
      );
    }
  );

  registerIDFCommand(context, "esp.rainmaker.backend.add_node", async () => {
    Logger.infoNotify(
      l10n.t("Coming Soon!! until then you can add nodes using mobile app")
    );
  });

  registerRainmakerCommand(
    context,
    "esp.rainmaker.backend.update_node_param",
    async (item: RMakerItem) => {
      if (!item || !item.id || !item.description) {
        return;
      }
      const idPayload = item.id.split("::");
      const params = item.getMeta<RainmakerDeviceParamStructure>();

      if (params.properties.indexOf("write") === -1) {
        return Logger.infoNotify("Readonly Property");
      }

      let newParamValue;
      if (params.data_type === "bool") {
        newParamValue = await window.showQuickPick(["true", "false"], {
          ignoreFocusOut: true,
          placeHolder: "Select a new param value",
        });
      } else {
        newParamValue = await window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "param value",
          value: item.description.toString(),
          prompt: "Enter the new param value",
          validateInput: (value: string): string => {
            return validateInputForRainmakerDeviceParam(
              value,
              params.data_type
            );
          },
        });
      }

      if (!newParamValue) {
        return;
      }

      newParamValue = convertTo(params.data_type, newParamValue);

      await withProgressWrapper(
        [],
        "ESP-IDF: Syncing params, please wait",
        async (_progress, _cancelToken) => {
          const nodeID = idPayload[0];
          const deviceName = idPayload[1];
          await RainmakerAPIClient.updateNodeParam(
            nodeID,
            deviceName,
            params.name,
            newParamValue
          );
          await rainMakerTreeDataProvider.refresh();
          Logger.infoNotify("Sent the param update request to cloud");
        }
      );
    }
  );

  context.subscriptions.push(
    window.registerUriHandler({
      handleUri: async (uri: Uri) => {
        const query = uri.query.split("=");
        if (uri.path === "/rainmaker" && query[0] === "code") {
          const code = query[1] || "";
          await withProgressWrapper(
            [],
            l10n.t(
              "ESP-IDF: Please wait mapping your rainmaker cloud account with the VS Code Extension, this could take a little while"
            ),
            async (_progress, _cancelToken) => {
              try {
                await RainmakerAPIClient.exchangeCodeForTokens(code);
                await rainMakerTreeDataProvider.refresh();
                Logger.infoNotify(
                  l10n.t(
                    "Rainmaker Cloud is connected successfully (via OAuth)!"
                  )
                );
              } catch (error) {
                return Logger.errorNotify(
                  l10n.t("Failed to sign-in with Rainmaker (via OAuth)"),
                  error as Error,
                  "extension rainmaker Uri handler",
                  { meta: JSON.stringify(error) }
                );
              }
            }
          );
          return;
        }
        Logger.warn(`Failed to handle URI Open, ${uri.toString()}`);
      },
    })
  );
}

function validateInputForRainmakerDeviceParam(
  value: string,
  type: string
): string {
  if (type === "string" && value === "") {
    return l10n.t("Enter non empty string");
  }
  if (type === "int" && !value.match(/^[0-9]+$/)) {
    return l10n.t("Enter a valid integer");
  }
  return "";
}

function convertTo(type: string, value: string): any {
  if (type === "bool") {
    return value === "true" ? true : false;
  }
  if (type === "int") {
    return parseInt(value);
  }
  return value;
}
