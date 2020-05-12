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
  RainmakerDevice,
  RainmakerDeviceParamStructure,
  RainmakerDeviceType,
  RainmakerDeviceParamType,
  RainmakerDeviceParams,
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
        nodes = await this.fetchNodes();
      }
      if (!nodes) {
        return;
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
    } else if (parent.contextValue === "esp.rainmaker.cloud.nodes") {
      // For each nodes get all devices
      const nodeID = parent.id;
      let nodes = this.context.globalState.get<RainmakerNodeWithDetails>(
        ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY,
        null
      );
      if (nodeID && nodes) {
        const filteredDeviceDetails = nodes.node_details.filter(
          (details) => details.id === nodeID
        )[0];
        filteredDeviceDetails.config.devices.forEach((device) => {
          children.push(this.generateTreeItemsForDevices(device, nodeID));
        });
      }
    } else if (parent.contextValue === "esp.rainmaker.cloud.nodes.devices") {
      // For each devices get all params
      const id = parent.id.split("::");
      let nodes = this.context.globalState.get<RainmakerNodeWithDetails>(
        ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY,
        null
      );
      if (nodes && id.length > 0) {
        const nodeID = id[0];
        const deviceName = id[1];
        const filteredDeviceDetails = nodes.node_details.filter(
          (details) => details.id === nodeID
        )[0];
        const filteredDevice = filteredDeviceDetails.config.devices.filter(
          (device) => device.name === deviceName
        )[0];

        const paramsValueForDevice =
          filteredDeviceDetails.params[filteredDevice.name];

        filteredDevice.params.forEach((param) => {
          children.push(
            this.generateTreeItemsForDeviceParams(
              param,
              paramsValueForDevice[param.name]
            )
          );
        });
      }
    }

    return children;
  }
  public async refresh() {
    this.initCache();
    this.clearCacheFor(ESP.Rainmaker.USER_ASSOCIATED_NODES_CACHE_KEY);
    this._onDidChangeTreeData.fire();
  }

  public clearCacheFor(key: string) {
    this.context.globalState.update(key, null);
  }

  private getIconPathForDeviceType(type: RainmakerDeviceType): ThemeIcon {
    switch (type) {
      case RainmakerDeviceType.Switch:
        return new ThemeIcon("symbol-boolean");
      case RainmakerDeviceType.LightBulb:
        return new ThemeIcon("lightbulb");
      case RainmakerDeviceType.Fan:
        return new ThemeIcon("chrome-close");
      case RainmakerDeviceType.TemperatureSensor:
        return new ThemeIcon("radio-tower");
      default:
        return new ThemeIcon("symbol-event");
    }
  }

  getIconPathForParamType(type: RainmakerDeviceParamType): ThemeIcon {
    switch (type) {
      case RainmakerDeviceParamType.Name:
        return new ThemeIcon("case-sensitive");
      case RainmakerDeviceParamType.Power:
        return new ThemeIcon("plug");
      case RainmakerDeviceParamType.Brightness:
      case RainmakerDeviceParamType.ColorTemperature:
      case RainmakerDeviceParamType.Hue:
      case RainmakerDeviceParamType.Saturation:
      case RainmakerDeviceParamType.Intensity:
        return new ThemeIcon("color-mode");
      case RainmakerDeviceParamType.Speed:
        return new ThemeIcon("dashboard");
      case RainmakerDeviceParamType.Direction:
        return new ThemeIcon("arrow-both");
      case RainmakerDeviceParamType.Temperature:
        return new ThemeIcon("symbol-ruler");
      default:
        return new ThemeIcon("symbol-namespace");
    }
  }

  private generateTreeItemsForDeviceParams(
    param: RainmakerDeviceParamStructure,
    value: string | number | boolean
  ): ESPRainmakerTreeDataItem {
    const paramItem = new ESPRainmakerTreeDataItem(
      param.name,
      TreeItemCollapsibleState.None
    );
    paramItem.iconPath = this.getIconPathForParamType(param.type);
    paramItem.tooltip = param.type;
    paramItem.description = value.toString();
    paramItem.contextValue = "esp.rainmaker.cloud.nodes.devices.params";
    // paramItem.id
    return paramItem;
  }
  private generateTreeItemsForDevices(
    dev: RainmakerDevice,
    nodeId: string
  ): ESPRainmakerTreeDataItem {
    const device = new ESPRainmakerTreeDataItem(
      dev.name,
      TreeItemCollapsibleState.Collapsed
    );
    device.description = dev.primary;
    device.iconPath = this.getIconPathForDeviceType(dev.type);
    device.id = `${nodeId}::${dev.name}`;
    device.contextValue = "esp.rainmaker.cloud.nodes.devices";
    return device;
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
    nodeTreeItem.iconPath = new ThemeIcon("circuit-board");
    return nodeTreeItem;
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
