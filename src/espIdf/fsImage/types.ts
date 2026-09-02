/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 1st September 2026 3:31:00 pm
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

export type FsKind = "spiffs" | "fatfs" | "littlefs" | "nvs" | "unknown";

export type NonFsFormat =
  | "espAppImage"
  | "espPartitionTable"
  | "elf"
  | "erased";

export interface DetectResult {
  kind: FsKind;
  hintKind?: FsKind;
  hintMismatch: boolean;
  /** Set only when kind is "unknown", to explain what the binary is instead. */
  nonFsFormat?: NonFsFormat;
}

export interface FsNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  nvsType?: string;
  nvsValuePreview?: string;
  children?: FsNode[];
  warning?: string;
  error?: string;
}

export function emptyDir(name: string, path: string): FsNode {
  return { name, path, isDir: true, children: [] };
}

export function addChildPath(
  root: FsNode,
  relPath: string,
  file: { size?: number; isDir?: boolean }
): void {
  const parts = relPath.split(/[/\\]/).filter((part) => part && part !== ".");
  if (parts.length === 0) {
    return;
  }
  let current = root;
  let currentPath = root.path;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
    if (!current.children) {
      current.children = [];
    }
    let child = current.children.find((node) => node.name === part);
    if (!child) {
      child = {
        name: part,
        path: currentPath,
        isDir: isLast ? !!file.isDir : true,
        size: isLast && !file.isDir ? file.size : undefined,
        children: isLast && !file.isDir ? undefined : [],
      };
      current.children.push(child);
    } else if (isLast && !file.isDir) {
      child.size = file.size;
      child.isDir = false;
    }
    current = child;
  }
}

export function sortFsNode(node: FsNode): void {
  if (!node.children) {
    return;
  }
  node.children.sort((a, b) => {
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortFsNode(child);
  }
}

export function subtypeHintToKind(subtype?: string): FsKind | undefined {
  if (!subtype) {
    return undefined;
  }
  const normalized = subtype.trim().toLowerCase();
  if (normalized === "nvs" || normalized === "0x02") {
    return "nvs";
  }
  if (normalized === "fat" || normalized === "0x81") {
    return "fatfs";
  }
  if (normalized === "spiffs" || normalized === "0x82") {
    return "spiffs";
  }
  if (normalized === "littlefs" || normalized === "0x83") {
    return "littlefs";
  }
  return undefined;
}

export function readFlashCString(buf: Buffer): string {
  let end = 0;
  while (end < buf.length && buf[end] !== 0 && buf[end] !== 0xff) {
    end++;
  }
  return buf.subarray(0, end).toString("utf8");
}

export function fsKindLabel(kind: FsKind): string {
  switch (kind) {
    case "spiffs":
      return "SPIFFS";
    case "fatfs":
      return "FAT";
    case "littlefs":
      return "LittleFS";
    case "nvs":
      return "NVS";
    default:
      return "Unknown";
  }
}
