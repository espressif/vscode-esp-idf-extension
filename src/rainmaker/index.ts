/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Saturday, 9th May 2020 7:55:42 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  TreeDataProvider,
  TreeItem,
  ExtensionContext,
  TreeItemCollapsibleState,
  EventEmitter,
  ThemeIcon,
  commands,
} from "vscode";
import { ESP } from "../config";
import {
  RainmakerUserTokenModel,
  RainmakerNodeWithDetails,
  RainmakerNodeConfig,
} from "./client_model";
import { Event } from "vscode-languageclient";
import { RainmakerAPIClient } from "./client";
import { Logger } from "../logger/logger";

class ESPRainmakerTreeDataItem extends TreeItem {}

export class ESPRainMakerTreeDataProvider
  implements TreeDataProvider<ESPRainmakerTreeDataItem> {
  private _onDidChangeTreeData: EventEmitter<
    ESPRainmakerTreeDataItem
  > = new EventEmitter<ESPRainmakerTreeDataItem>();

  readonly onDidChangeTreeData: Event<ESPRainmakerTreeDataItem> = this
    ._onDidChangeTreeData.event;
  private context: ExtensionContext;
  private accessTokens: RainmakerUserTokenModel | undefined;
  private client: RainmakerAPIClient | undefined;

  constructor(ctx: ExtensionContext) {
    this.context = ctx;
    this.initCache();
  }

  getTreeItem(item: ESPRainmakerTreeDataItem): ESPRainmakerTreeDataItem {
    return item;
  }

  /**
   * Structure is something like this:
   * > Rainmaker cloud
   *   > Node Name
   *     > Device Name 1
   *       > Device Param 1 (on click edit params)
   *       > Device Param 2
   *     > Device Name 2
   *    .
   *    .
   *    .
   */
  async getChildren(
    parent?: ESPRainmakerTreeDataItem
  ): Promise<ESPRainmakerTreeDataItem[]> {
    const children = new Array<ESPRainmakerTreeDataItem>();
    if (!parent) {
      if (!this.accessTokens) {
        const connectButton = new ESPRainmakerTreeDataItem(
          "Connect Rainmaker..."
        );
        connectButton.iconPath = new ThemeIcon("account");
        connectButton.command = {
          title: "Connect Rainmaker...",
          command: "esp.rainmaker.backend.connect",
        };
        children.push(connectButton);
      } else {
        const account = new ESPRainmakerTreeDataItem(
          "Rainmaker Cloud",
          TreeItemCollapsibleState.Collapsed
        );
        account.iconPath = new ThemeIcon("cloud-upload");
        account.contextValue = "esp.rainmaker.cloud.account";
        account.description = "(connected)";
        children.push(account);
      }
    } else if (
      parent.contextValue === "esp.rainmaker.cloud.account" &&
      this.client
    ) {
      let nodes = this.context.globalState.get<RainmakerNodeWithDetails>(
        ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY,
        null
      );
      if (!nodes) {
        try {
          nodes = await this.fetchNodes();
        } catch (error) {
          Logger.warnNotify("Failed to fetch node details, try refreshing");
          return;
        }
      }
      if (nodes.nodes.length === 0) {
        const noNodesAdded = new ESPRainmakerTreeDataItem(
          "0 Nodes associated",
          TreeItemCollapsibleState.None
        );
        noNodesAdded.description = "Try adding some ESP32-S2 devices";
        children.push(noNodesAdded);
      } else {
        nodes.node_details.forEach((details) => {
          children.push(this.generateTreeItemsForNodes(details.config));
        });
      }
    }

    return children;
  }
  public async refresh() {
    this.initCache();
    await this.refreshClientToken();
    this._onDidChangeTreeData.fire();
  }

  private generateTreeItemsForNodes(
    config: RainmakerNodeConfig
  ): ESPRainmakerTreeDataItem {
    const nodeTreeItem = new ESPRainmakerTreeDataItem(
      config.info.name,
      TreeItemCollapsibleState.Collapsed
    );
    nodeTreeItem.description = config.info.fw_version;
    nodeTreeItem.id = config.node_id;
    nodeTreeItem.contextValue = "esp.rainmaker.cloud.nodes";
    nodeTreeItem.iconPath = new ThemeIcon("vm");
    return nodeTreeItem;
  }

  private async fetchNodes(): Promise<RainmakerNodeWithDetails> {
    await this.refreshClientToken();
    const nodes = await this.client.getAllUserAssociatedNodes();

    this.context.globalState.update(
      ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY,
      nodes
    );

    return nodes;
  }

  private async refreshClientToken() {
    if (this.client) {
      try {
        const newAccessToken = await this.client.refreshAccessToken();
        this.accessTokens.accesstoken = newAccessToken;
        this.context.globalState.update(
          ESP.Rainmaker.USER_TOKEN_CACHE_KEY,
          this.accessTokens
        );
      } catch (error) {
        Logger.warnNotify("Failed to refresh access token");
      }
    }
  }

  private initCache() {
    this.accessTokens = this.context.globalState.get<RainmakerUserTokenModel>(
      ESP.Rainmaker.USER_TOKEN_CACHE_KEY,
      undefined
    );
    let loggedInStatus = false;
    if (this.accessTokens) {
      loggedInStatus = true;
      this.client = new RainmakerAPIClient(
        this.accessTokens.accesstoken,
        this.accessTokens.refreshtoken
      );
    } else {
      this.client = null;
    }
    commands.executeCommand(
      "setContext",
      ESP.Rainmaker.USER_ALREADY_LOGGED_IN_CACHE_KEY,
      loggedInStatus
    );
  }
}
