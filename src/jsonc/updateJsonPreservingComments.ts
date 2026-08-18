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
  const existingJson = parse(content, errors) as { [key: string]: any };
  if (errors.length > 0) {
    throw new Error(`Failed to parse JSON file with ${errors.length} errors`);
  }

  const keys = keysToUpdate ?? getChangedKeys(existingJson, json);

  for (const key of keys) {
    const path = Array.isArray(key) ? key : [key];
    content = updateJsonContent(content, path, getValueAtPath(json, path));
  }

  await writeFile(filePath, content, { encoding: "utf8" });
}

function getChangedKeys(
  existingJson: { [key: string]: any } = {},
  newJson: { [key: string]: any } = {}
) {
  const allKeys = new Set([
    ...Object.keys(existingJson),
    ...Object.keys(newJson),
  ]);

  return Array.from(allKeys).filter((key) => {
    const existingHasKey = Object.prototype.hasOwnProperty.call(existingJson, key);
    const newHasKey = Object.prototype.hasOwnProperty.call(newJson, key);

    if (existingHasKey !== newHasKey) {
      return true;
    }

    return !isDeepStrictEqual(existingJson[key], newJson[key]);
  });
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
