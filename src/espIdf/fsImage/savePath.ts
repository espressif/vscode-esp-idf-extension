/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 30th September 2026 1:52:00 pm
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

import { basename, parse, relative, resolve, sep } from "path";
import { normalizeFsPath } from "./types";

const FILES_FROM_IMAGE = "filesFromImage";

/** Maps an in-image path onto a file inside the workspace, rejecting traversal. */
export function workspaceDestination(
  workspaceRoot: string,
  imagePath: string,
  virtualPath: string
): string | undefined {
  const imageName = imageFolderName(imagePath);
  const parts = normalizeFsPath(virtualPath)
    .split("/")
    .filter((part) => part.length > 0);
  if (!imageName || parts.length === 0 || parts.some((part) => part === "..")) {
    return undefined;
  }
  const destination = resolve(
    workspaceRoot,
    FILES_FROM_IMAGE,
    imageName,
    ...parts
  );
  const root = resolve(workspaceRoot);
  const fromRoot = relative(root, destination);
  if (
    !fromRoot ||
    fromRoot === ".." ||
    fromRoot.startsWith("../") ||
    fromRoot.startsWith(`..${sep}`)
  ) {
    return undefined;
  }
  return destination;
}

function imageFolderName(imagePath: string): string | undefined {
  const name = parse(basename(imagePath)).name;
  if (!name || name === "." || name === "..") {
    return undefined;
  }
  return name;
}
