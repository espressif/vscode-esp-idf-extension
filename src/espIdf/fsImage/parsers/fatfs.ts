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

import { mkdtemp, pathExists, readFile, readdir, remove, stat } from "fs-extra";
import { tmpdir } from "os";
import { join } from "path";
import {
  addChildPath,
  emptyDir,
  FsNode,
  normalizeFsPath,
  sortFsNode,
} from "../types";

export type FsImageSpawn = (
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    silent?: boolean;
    sendToTelemetry?: boolean;
  }
) => Promise<Buffer>;

export interface FatfsListDeps {
  pythonPath: string;
  fatfsparsePath: string;
  spawnFn: FsImageSpawn;
  env?: NodeJS.ProcessEnv;
}

export async function listFatfs(
  imagePath: string,
  deps: FatfsListDeps
): Promise<FsNode> {
  const root = emptyDir("/", "/");
  if (!(await pathExists(deps.fatfsparsePath))) {
    root.error =
      "FAT listing requires ESP-IDF fatfsparse.py (components/fatfs/fatfsparse.py).";
    return root;
  }
  if (!deps.pythonPath) {
    root.error =
      "Python is not configured for the current ESP-IDF environment.";
    return root;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "esp-idf-fatfs-"));
  try {
    await deps.spawnFn(
      deps.pythonPath,
      [deps.fatfsparsePath, "--wl-layer", "detect", imagePath],
      {
        cwd: tempDir,
        env: deps.env,
        silent: true,
        sendToTelemetry: false,
      }
    );
    await walkDir(tempDir, "", root);
    liftVolumeLabelDirectory(root);
    sortFsNode(root);
    return root;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "fatfsparse.py failed";
    root.error = `FAT listing failed: ${message}`;
    return root;
  } finally {
    await remove(tempDir).catch(() => undefined);
  }
}

export async function readFatfsFile(
  imagePath: string,
  virtualPath: string,
  deps: FatfsListDeps
): Promise<Buffer | undefined> {
  if (!(await pathExists(deps.fatfsparsePath)) || !deps.pythonPath) {
    return undefined;
  }
  const tempDir = await mkdtemp(join(tmpdir(), "esp-idf-fatfs-"));
  try {
    await deps.spawnFn(
      deps.pythonPath,
      [deps.fatfsparsePath, "--wl-layer", "detect", imagePath],
      {
        cwd: tempDir,
        env: deps.env,
        silent: true,
        sendToTelemetry: false,
      }
    );
    const files = await indexExtractedFiles(tempDir);
    const absPath = files.get(normalizeFsPath(virtualPath));
    if (!absPath) {
      return undefined;
    }
    return await readFile(absPath);
  } finally {
    await remove(tempDir).catch(() => undefined);
  }
}

async function indexExtractedFiles(
  tempDir: string
): Promise<Map<string, string>> {
  const root = emptyDir("/", "/");
  const located = new Map<string, string>();
  await walkDir(tempDir, "", root, located);
  const prefix = volumeLabelPrefix(root);
  if (!prefix) {
    return located;
  }
  const lifted = new Map<string, string>();
  for (const [filePath, absPath] of located) {
    if (filePath === prefix || filePath.startsWith(`${prefix}/`)) {
      lifted.set(filePath.slice(prefix.length) || "/", absPath);
    }
  }
  return lifted;
}

function volumeLabelPrefix(root: FsNode): string | undefined {
  const children = root.children;
  if (children?.length !== 1) {
    return undefined;
  }
  const [wrapper] = children;
  if (!wrapper.isDir || !wrapper.children) {
    return undefined;
  }
  return `/${wrapper.name}`;
}

/**
 * fatfsparse.py reconstructs the image inside a folder named after the volume
 * label, so the partition root would otherwise be nested one level deep.
 */
function liftVolumeLabelDirectory(root: FsNode): void {
  const children = root.children;
  if (children?.length !== 1) {
    return;
  }
  const [wrapper] = children;
  if (!wrapper.isDir || !wrapper.children) {
    return;
  }
  root.children = wrapper.children.map((child) => rebasePath(child, ""));
}

function rebasePath(node: FsNode, parentPath: string): FsNode {
  const path = `${parentPath}/${node.name}`;
  return {
    ...node,
    path,
    children: node.children?.map((child) => rebasePath(child, path)),
  };
}

async function walkDir(
  absDir: string,
  relDir: string,
  root: FsNode,
  files?: Map<string, string>
): Promise<void> {
  const entries = await readdir(absDir);
  for (const entry of entries) {
    const absPath = join(absDir, entry);
    const relPath = relDir ? `${relDir}/${entry}` : entry;
    const info = await stat(absPath);
    if (info.isDirectory()) {
      addChildPath(root, relPath, { isDir: true });
      await walkDir(absPath, relPath, root, files);
    } else {
      addChildPath(root, relPath, { size: info.size });
      files?.set(normalizeFsPath(relPath), absPath);
    }
  }
}
