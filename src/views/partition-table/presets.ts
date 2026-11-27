/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th November 2026
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

import { formatSizeToken } from "./layout";

export interface PresetRow {
  name: string;
  type: string;
  subtype: string;
  offset: string;
  size: string;
  flag: boolean;
  readOnly: boolean;
  error: string;
}

interface PresetPartition {
  name: string;
  type: string;
  subtype: string;
  size: number;
}

export interface PartitionPreset {
  id: string;
  label: string;
  partitions: PresetPartition[];
}

export const PARTITION_PRESETS: PartitionPreset[] = [
  {
    id: "factory",
    label: "Single factory app",
    partitions: [
      { name: "nvs", type: "data", subtype: "nvs", size: 0x5000 },
      { name: "factory", type: "app", subtype: "factory", size: 0x3f0000 },
    ],
  },
  {
    id: "ota-spiffs",
    label: "OTA with SPIFFS",
    partitions: [
      { name: "nvs", type: "data", subtype: "nvs", size: 0x5000 },
      { name: "otadata", type: "data", subtype: "ota", size: 0x2000 },
      { name: "app0", type: "app", subtype: "ota_0", size: 0x140000 },
      { name: "app1", type: "app", subtype: "ota_1", size: 0x140000 },
      { name: "spiffs", type: "data", subtype: "spiffs", size: 0x160000 },
      { name: "coredump", type: "data", subtype: "coredump", size: 0x10000 },
    ],
  },
  {
    id: "ota-fat",
    label: "OTA with FAT",
    partitions: [
      { name: "nvs", type: "data", subtype: "nvs", size: 0x5000 },
      { name: "otadata", type: "data", subtype: "ota", size: 0x2000 },
      { name: "app0", type: "app", subtype: "ota_0", size: 0x140000 },
      { name: "app1", type: "app", subtype: "ota_1", size: 0x140000 },
      { name: "fat", type: "data", subtype: "fat", size: 0x160000 },
      { name: "coredump", type: "data", subtype: "coredump", size: 0x10000 },
    ],
  },
  {
    id: "zigbee",
    label: "Zigbee ESP-IDF",
    partitions: [
      { name: "nvs", type: "data", subtype: "nvs", size: 0x6000 },
      { name: "phy_init", type: "data", subtype: "phy", size: 0x1000 },
      { name: "factory", type: "app", subtype: "factory", size: 0x12c000 },
      { name: "zb_storage", type: "data", subtype: "nvs", size: 0x4000 },
      { name: "zb_fct", type: "data", subtype: "fat", size: 0x400 },
    ],
  },
];

export function createPresetRows(id: string): PresetRow[] | undefined {
  const preset = PARTITION_PRESETS.find((item) => item.id === id);
  if (!preset) {
    return undefined;
  }
  return preset.partitions.map((partition) => ({
    name: partition.name,
    type: partition.type,
    subtype: partition.subtype,
    offset: "",
    size: formatSizeToken(partition.size),
    flag: false,
    readOnly: false,
    error: "",
  }));
}
