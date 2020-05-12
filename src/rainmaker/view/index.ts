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
  ExtensionContext,
  EventEmitter,
  commands,
  Event,
} from "vscode";
import { RainmakerAPIClient } from "../client";
import {
  LoggedInAccountItem,
  LoginButtonItem,
  ZeroNodesAssociatedItem,
  SingleNodeItem,
  DeviceItem,
  DeviceParamItem,
} from "./item_generator";
import { ESP } from "../../config";
import { Logger } from "../../logger/logger";
import { RMakerItem, RMakerItemType } from "./item";
import {
  RainmakerUserTokenModel,
  RainmakerNodeWithDetails,
  NodeDetails,
  RainmakerDevice,
} from "../client/model";

export class ESPRainMakerTreeDataProvider
  implements TreeDataProvider<RMakerItem> {
  private _onDidChangeTreeData: EventEmitter<RMakerItem> = new EventEmitter<
    RMakerItem
  >();

  readonly onDidChangeTreeData: Event<RMakerItem> = this._onDidChangeTreeData
    .event;
  private context: ExtensionContext;
  private accessTokens: RainmakerUserTokenModel | undefined;
  private client: RainmakerAPIClient | undefined;

  constructor(ctx: ExtensionContext) {
    this.context = ctx;
    this.initCache();
  }

  getTreeItem(item: RMakerItem): RMakerItem {
    return item;
  }

  async getChildren(parent?: RMakerItem): Promise<RMakerItem[]> {
    if (!parent) {
      if (this.accessTokens) {
        return [LoggedInAccountItem()];
      } else {
        return [LoginButtonItem()];
      }
    } else if (parent.type === RMakerItemType.Account) {
      let nodes = this.context.globalState.get<RainmakerNodeWithDetails>(
        ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY,
        null
      );
      if (!nodes) {
        nodes = await this.fetchNodes();
      }
      if (!nodes) {
        return;
      }
      if (nodes.nodes.length === 0) {
        return [ZeroNodesAssociatedItem()];
      } else {
        return nodes.node_details.map((details) => SingleNodeItem(details));
      }
    } else if (parent.type === RMakerItemType.Node) {
      const node = parent.getMeta<NodeDetails>();
      return node.config.devices.map((device) => DeviceItem(device, node.id));
    } else if (parent.type === RMakerItemType.Device) {
      const args = parent.id.split("::");
      const nodeId = args[0];
      let value = null;
      const device = parent.getMeta<RainmakerDevice>();
      try {
        const resp = await this.client.getNodeParams(nodeId);
        value = resp[device.name];
      } catch (error) {
        Logger.errorNotify("Failed to get params for device", error);
      }
      return device.params.map((param) =>
        DeviceParamItem(param, value ? value[param.name] : "")
      );
    }
  }
  public async refresh() {
    this.initCache();
    this.clearCacheFor(ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY);
    this._onDidChangeTreeData.fire();
  }

  public clearCacheFor(key: string) {
    this.context.globalState.update(key, null);
  }

  private async fetchNodes(): Promise<RainmakerNodeWithDetails> {
    if (!this.client) {
      return;
    }
    try {
      await this.refreshClientToken();
      const nodes = await this.client.getAllUserAssociatedNodes();

      this.context.globalState.update(
        ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY,
        nodes
      );
      return nodes;
    } catch (error) {
      Logger.warnNotify("Failed to fetch node details, try refreshing", error);
    }
    return null;
  }

  private async refreshClientToken() {
    if (!this.client) {
      return;
    }
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
