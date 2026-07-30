/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 9th July 2026
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { ESP } from "../config";
import { Logger } from "../logger/logger";
import { ConfigurePreset, ESPIDFSettings } from "./projectConfiguration";

/**
 * Resolves the "inherits" chain of a preset, depth first, and strips the field
 * from the result. Child properties win over parent properties.
 * @param allPresets Every preset from CMakePresets.json and CMakeUserPresets.json.
 */
export function resolvePresetInheritance(
  preset: ConfigurePreset,
  allPresets: { [key: string]: ConfigurePreset },
  visiting: Set<string> = new Set()
): ConfigurePreset {
  if (!preset.inherits) {
    return { ...preset };
  }

  const parentNames = Array.isArray(preset.inherits)
    ? preset.inherits
    : [preset.inherits];

  let resolvedPreset: ConfigurePreset = { name: preset.name };

  visiting.add(preset.name);
  try {
    for (const parentName of parentNames) {
      if (visiting.has(parentName)) {
        const cycle = [...visiting, parentName].join(" -> ");
        Logger.warn(
          `Circular preset inheritance detected for "${preset.name}": ${cycle}`,
          new Error("Circular preset inheritance")
        );
        continue;
      }

      const parentPreset = allPresets[parentName];
      if (!parentPreset) {
        Logger.warn(
          `Preset "${preset.name}" inherits from "${parentName}" which was not found`,
          new Error("Missing parent preset")
        );
        continue;
      }

      const resolvedParent = resolvePresetInheritance(
        parentPreset,
        allPresets,
        visiting
      );

      resolvedPreset = mergePresets(resolvedPreset, resolvedParent);
    }
  } finally {
    visiting.delete(preset.name);
  }

  resolvedPreset = mergePresets(resolvedPreset, preset);

  delete resolvedPreset.inherits;

  return resolvedPreset;
}

/**
 * Merges a child preset onto a parent preset. cacheVariables, environment and the
 * ESP-IDF vendor settings are merged key by key instead of being replaced wholesale.
 */
export function mergePresets(
  parent: ConfigurePreset,
  child: ConfigurePreset
): ConfigurePreset {
  const merged: ConfigurePreset = { ...parent, ...child };

  if (child.cacheVariables || parent.cacheVariables) {
    merged.cacheVariables = {
      ...(parent.cacheVariables || {}),
      ...(child.cacheVariables || {}),
    };
  }

  if (child.environment || parent.environment) {
    merged.environment = {
      ...(parent.environment || {}),
      ...(child.environment || {}),
    };
  }

  if (child.vendor || parent.vendor) {
    const vendorKey = ESP.CMakePresets.ESP_IDF_VENDOR_KEY;
    const settingsByType = new Map<string, ESPIDFSettings>();
    for (const setting of parent.vendor?.[vendorKey]?.settings || []) {
      settingsByType.set(setting.type, setting);
    }
    for (const setting of child.vendor?.[vendorKey]?.settings || []) {
      settingsByType.set(setting.type, setting);
    }
    merged.vendor = {
      [vendorKey]: {
        schemaVersion: ESP.CMakePresets.CMAKE_PRESET_SCHEMA_VERSION,
        settings: [...settingsByType.values()],
      },
    };
  }

  return merged;
}
