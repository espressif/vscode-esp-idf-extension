/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 11th May 2020 12:09:40 pm
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

export interface RainmakerUserTokenModel {
  idtoken?: string;
  accesstoken?: string;
  refreshtoken?: string;
}

export interface RainmakerLoginResponseModel extends RainmakerUserTokenModel {
  status?: string;
  description?: string;
}

export interface RainmakerNodeStatus {
  connectivity: {
    connected: boolean;
    timestamp: number;
  };
}

export enum RainmakerDeviceType {
  Switch = "esp.device.switch",
  LightBulb = "esp.device.lightbulb",
  Fan = "esp.device.fan",
  TemperatureSensor = "esp.device.temperature-sensor",
}

export enum RainmakerDeviceParamType {
  Name = "esp.param.name",
  Power = "esp.param.power",
  Brightness = "esp.param.brightness",
  ColorTemperature = "esp.param.cct",
  Hue = "esp.param.hue",
  Saturation = "esp.param.saturation",
  Intensity = "esp.param.intensity",
  Speed = "esp.param.speed",
  Direction = "esp.param.direction",
  Temperature = "esp.param.temperature",
}

export interface RainmakerDevice {
  name: string;
  params: RainmakerDeviceParamStructure[];
  primary: string;
  type: RainmakerDeviceType;
}

export interface RainmakerNodeConfig {
  node_id: string;
  config_version: string;
  devices: RainmakerDevice[];
  info: {
    fw_version: string;
    name: string;
    type: string;
    model: string;
  };
  services: any[];
}

export type RW = "read" | "write";

export interface RainmakerDeviceParamStructure {
  name: string;
  data_type: string;
  type: RainmakerDeviceParamType;
  ui_type: string;
  properties: RW[];
}

export interface RainmakerDeviceParams {
  [deviceName: string]: {
    [paramName: string]: boolean | string | number;
  };
}

export interface NodeDetails {
  id: string;
  status: RainmakerNodeStatus;
  config: RainmakerNodeConfig;
  params: RainmakerDeviceParams;
}

export interface RainmakerNodeWithDetails {
  total: number;
  nodes: string[];
  node_details: NodeDetails[];
}

export interface RainmakerUserInfo {
  user_id: string;
  user_name: string;
}
