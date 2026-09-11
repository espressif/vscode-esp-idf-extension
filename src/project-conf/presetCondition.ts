/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 5th August 2026
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

import { Uri } from "vscode";
import { Logger } from "../common/logger";
import { ConfigurePreset, PresetCondition } from "./projectConfiguration";
import { substituteVariablesInConfigurePreset } from "./presetSubstitution";

/**
 * Tells whether a resolved preset applies to the current host. CMake refuses a
 * preset whose condition evaluates to false, so such presets must not be offered
 * for selection.
 *
 * A condition that cannot be evaluated counts as enabled: listing a preset CMake
 * will reject is less harmful than hiding one the user can actually build with.
 */
export function isPresetEnabled(
  preset: ConfigurePreset,
  workspaceFolder: Uri
): boolean {
  if (preset.condition === undefined || preset.condition === null) {
    return true;
  }

  try {
    return evaluateCondition(preset.condition, preset, workspaceFolder);
  } catch (error) {
    Logger.warn(
      `Ignoring the condition of preset "${preset.name}": ${error.message}`,
      error
    );
    return true;
  }
}

function evaluateCondition(
  condition: boolean | PresetCondition,
  preset: ConfigurePreset,
  workspaceFolder: Uri
): boolean {
  if (typeof condition === "boolean") {
    return condition;
  }
  if (typeof condition !== "object" || condition === null) {
    throw new Error(`unsupported condition ${JSON.stringify(condition)}`);
  }

  const expand = (value: string | undefined) =>
    expandRequiredString(value, preset, workspaceFolder);
  const evaluateNested = (nested: PresetCondition) =>
    evaluateCondition(nested, preset, workspaceFolder);

  switch (condition.type) {
    case "const":
      return condition.value === true;
    case "equals":
      return expand(condition.lhs) === expand(condition.rhs);
    case "notEquals":
      return expand(condition.lhs) !== expand(condition.rhs);
    case "inList":
      return isInList(condition, expand);
    case "notInList":
      return !isInList(condition, expand);
    case "matches":
      return doesMatch(condition, expand);
    case "notMatches":
      return !doesMatch(condition, expand);
    case "anyOf":
      return requiredConditions(condition).some(evaluateNested);
    case "allOf":
      return requiredConditions(condition).every(evaluateNested);
    case "not":
      if (!condition.condition) {
        throw new Error('a "not" condition requires a nested condition');
      }
      return !evaluateNested(condition.condition);
    default:
      throw new Error(`unknown condition type "${condition.type}"`);
  }
}

function isInList(
  condition: PresetCondition,
  expand: (value: string | undefined) => string
): boolean {
  if (!Array.isArray(condition.list)) {
    throw new Error(`a "${condition.type}" condition requires a list`);
  }
  const needle = expand(condition.string);
  return condition.list.some((item) => expand(item) === needle);
}

function doesMatch(
  condition: PresetCondition,
  expand: (value: string | undefined) => string
): boolean {
  return new RegExp(expand(condition.regex)).test(expand(condition.string));
}

function requiredConditions(condition: PresetCondition): PresetCondition[] {
  if (!Array.isArray(condition.conditions)) {
    throw new Error(`a "${condition.type}" condition requires conditions`);
  }
  return condition.conditions;
}

function expandRequiredString(
  value: string | undefined,
  preset: ConfigurePreset,
  workspaceFolder: Uri
): string {
  if (typeof value !== "string") {
    throw new Error("a required string field is missing");
  }
  return (
    substituteVariablesInConfigurePreset(value, workspaceFolder, preset) ??
    value
  );
}
