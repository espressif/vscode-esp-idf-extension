/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Sunday, 16th August 2026
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

import { applyEdits, modify, ParseError, parse } from "jsonc-parser";
import { pathExists, readFile, writeFile } from "fs-extra";
import { isDeepStrictEqual } from "util";

type JsonPath = Array<string | number>;

export async function updateJsonPreservingComments(
  filePath: string,
  json: { [key: string]: any },
  keysToUpdate?: Array<string | JsonPath>
) {
  let content = "{}";
  if (await pathExists(filePath)) {
    content = await readFile(filePath, "utf8");
  }

  const errors: ParseError[] = [];
  const existingJson = parse(content, errors, {
    allowTrailingComma: true,
  }) as { [key: string]: any };
  if (errors.length > 0) {
    throw new Error(`Failed to parse JSON file with ${errors.length} errors`);
  }

  if (keysToUpdate && keysToUpdate.length > 0) {
    for (const key of keysToUpdate) {
      const path = Array.isArray(key) ? key : [key];
      content = applyValueDiff(
        content,
        path,
        getValueAtPath(existingJson, path),
        getValueAtPath(json, path)
      );
    }
  } else {
    content = applyValueDiff(content, [], existingJson, json);
  }

  await writeFile(filePath, content, { encoding: "utf8" });
}

function getValueAtPath(json: { [key: string]: any }, path: JsonPath) {
  let current: any = json;
  for (const part of path) {
    if (typeof current === "undefined" || current === null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function applyValueDiff(
  content: string,
  path: JsonPath,
  currentValue: any,
  nextValue: any
) {
  if (isDeepStrictEqual(currentValue, nextValue)) {
    return content;
  }

  if (Array.isArray(currentValue) && Array.isArray(nextValue)) {
    return applyArrayDiff(content, path, currentValue, nextValue);
  }

  if (isObject(currentValue) && isObject(nextValue)) {
    return applyObjectDiff(content, path, currentValue, nextValue);
  }

  return updateJsonContent(content, path, nextValue);
}

function applyObjectDiff(
  content: string,
  path: JsonPath,
  currentObject: { [key: string]: any },
  nextObject: { [key: string]: any }
) {
  for (const key of Object.keys(currentObject)) {
    if (!Object.prototype.hasOwnProperty.call(nextObject, key)) {
      content = updateJsonContent(content, [...path, key], undefined);
    }
  }

  for (const key of Object.keys(nextObject)) {
    if (!Object.prototype.hasOwnProperty.call(currentObject, key)) {
      content = updateJsonContent(content, [...path, key], nextObject[key]);
      continue;
    }

    content = applyValueDiff(
      content,
      [...path, key],
      currentObject[key],
      nextObject[key]
    );
  }

  return content;
}

function applyArrayDiff(
  content: string,
  path: JsonPath,
  currentArray: any[],
  nextArray: any[]
) {
  const sharedLength = Math.min(currentArray.length, nextArray.length);
  for (let i = 0; i < sharedLength; i++) {
    content = applyValueDiff(
      content,
      [...path, i],
      currentArray[i],
      nextArray[i]
    );
  }

  for (let i = currentArray.length - 1; i >= nextArray.length; i--) {
    content = updateJsonContent(content, [...path, i], undefined);
  }

  for (let i = currentArray.length; i < nextArray.length; i++) {
    content = updateJsonContent(content, [...path, i], nextArray[i]);
  }

  return content;
}

function isObject(value: any): value is { [key: string]: any } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function updateJsonContent(content: string, path: JsonPath, value: any) {
  const edits = modify(content, path, value, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
      eol: content.includes("\r\n") ? "\r\n" : "\n",
    },
  });
  return applyEdits(content, edits);
}
