/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 12th May 2020 3:19:38 pm
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

import { TreeItemCollapsibleState } from "vscode";
import { RMakerItem, RMakerItemType } from "./item";
import {
  NodeDetails,
  RainmakerDevice,
  RainmakerDeviceParamStructure,
  RainmakerDeviceType,
  RainmakerDeviceParamType,
  RainmakerUserInfo,
} from "../client/model";

export function LoginButtonItem(): RMakerItem {
  const loginButton = new RMakerItem(
    RMakerItemType.Login,
    "Connect Rainmaker..."
  );
  loginButton.themeIcon = "sign-in";
  loginButton.commandId = "esp.rainmaker.backend.connect";
  return loginButton;
}

export function LoggedInAccountItem(userInfo: RainmakerUserInfo): RMakerItem {
  const account = new RMakerItem(RMakerItemType.Account, "Rainmaker Cloud");
  account.collapsibleState = TreeItemCollapsibleState.Collapsed;
  account.themeIcon = "cloud-upload";
  account.description = `(${userInfo.user_name})`;
  return account;
}

export function ZeroNodesAssociatedItem(): RMakerItem {
  const node = new RMakerItem(RMakerItemType.None, "No nodes associated");
  node.description = "Try adding some ESP32-S2 devices";
  node.themeIcon = "warning";
  return node;
}

export function SingleNodeItem(details: NodeDetails): RMakerItem {
  const node = new RMakerItem(RMakerItemType.Node, details.config.info.name);
  node.collapsibleState = TreeItemCollapsibleState.Collapsed;
  node.description = details.status.connectivity.connected
    ? "(online)"
    : "(offline)";
  node.themeIcon = "circuit-board";
  node.id = details.id;
  node.meta = details;
  return node;
}

export function DeviceItem(
  details: RainmakerDevice,
  nodeID: string
): RMakerItem {
  const device = new RMakerItem(RMakerItemType.Device, details.name);
  device.collapsibleState = TreeItemCollapsibleState.Collapsed;
  // device.description = ""
  device.themeIcon = getIconPathForDeviceType(details.type);
  device.id = `${nodeID}::${details.name}`;
  device.meta = details;
  return device;
}

export function DeviceParamItem(
  id: string,
  details: RainmakerDeviceParamStructure,
  value: string | number | boolean
): RMakerItem {
  const param = new RMakerItem(RMakerItemType.Param, details.name);
  param.tooltip = details.type;
  param.description = value.toString();
  param.themeIcon = getIconPathForParamType(details.type);
  param.id = `${id}::${details.name}`;
  param.meta = details;
  return param;
}

function getIconPathForDeviceType(type: RainmakerDeviceType): string {
  switch (type) {
    case RainmakerDeviceType.Switch:
      return "symbol-boolean";
    case RainmakerDeviceType.LightBulb:
      return "lightbulb";
    case RainmakerDeviceType.Fan:
      return "chrome-close";
    case RainmakerDeviceType.TemperatureSensor:
      return "radio-tower";
    default:
      return "symbol-event";
  }
}

function getIconPathForParamType(type: RainmakerDeviceParamType): string {
  switch (type) {
    case RainmakerDeviceParamType.Name:
      return "case-sensitive";
    case RainmakerDeviceParamType.Power:
      return "plug";
    case RainmakerDeviceParamType.Brightness:
    case RainmakerDeviceParamType.ColorTemperature:
    case RainmakerDeviceParamType.Hue:
    case RainmakerDeviceParamType.Saturation:
    case RainmakerDeviceParamType.Intensity:
      return "color-mode";
    case RainmakerDeviceParamType.Speed:
      return "dashboard";
    case RainmakerDeviceParamType.Direction:
      return "arrow-both";
    case RainmakerDeviceParamType.Temperature:
      return "symbol-ruler";
    default:
      return "symbol-namespace";
  }
}
