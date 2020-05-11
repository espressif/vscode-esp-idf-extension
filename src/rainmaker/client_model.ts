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

export interface RainmakerDevice {
  name: string;
  params: RainmakerNodeParam[];
  primary: string;
  type: string;
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

export interface RainmakerNodeParam {
  name: string;
  data_type: string;
  type: string;
  ui_type: string;
  properties: RW[];
}

export interface NodeDetails {
  id: string;
  status: RainmakerNodeStatus;
  config: RainmakerNodeConfig;
  param: RainmakerNodeParam;
}

export interface RainmakerNodeWithDetails {
  total: number;
  nodes: string[];
  node_details: NodeDetails[];
}
