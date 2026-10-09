/*
 * Project: ESP-IDF VSCode Extension
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

import { copy, pathExists, readFile } from "fs-extra";
import { isAbsolute, join } from "path";
import { Logger } from "../../../common/logger";

const ENCRYPT_WRITE_FLAGS = new Set(["--encrypt", "--encrypt-files"]);

/**
 * Sibling path esptool compares with `--diff-with`.
 * `bootloader/bootloader.bin` becomes `bootloader/bootloader_flashed.bin`.
 */
export function flashedReferencePath(binFilePath: string): string | undefined {
  if (!binFilePath.endsWith(".bin")) {
    return undefined;
  }
  return `${binFilePath.slice(0, -4)}_flashed.bin`;
}

/** Address/file pairs after `write-flash`, in the order esptool will write them. */
export function flashedBinPaths(flasherArgs: string[]): string[] {
  const writeIndex = flasherArgs.findIndex(
    (arg) => arg === "write_flash" || arg === "write-flash"
  );
  if (writeIndex === -1) {
    return [];
  }
  const bins: string[] = [];
  const tail = flasherArgs.slice(writeIndex + 1);
  for (let index = 0; index < tail.length; index++) {
    if (!/^0x[0-9a-fA-F]+$/.test(tail[index])) {
      continue;
    }
    const file = tail[index + 1];
    if (file && !file.startsWith("-")) {
      bins.push(file);
      index++;
    }
  }
  return bins;
}

/**
 * Binaries to compare and snapshot. Empty when fast reflashing does not apply.
 * esptool does not fast-reflash `--encrypt` or `--encrypt-files` writes.
 */
export function fastReflashBinPaths(
  flasherArgs: string[],
  enabled: boolean
): string[] {
  if (!enabled || flasherArgs.some((arg) => ENCRYPT_WRITE_FLAGS.has(arg))) {
    return [];
  }
  return flashedBinPaths(flasherArgs);
}

export function fastReflashArgs(
  binPaths: string[],
  referenceExists: (refPath: string) => boolean
): string[] {
  if (binPaths.length === 0) {
    return [];
  }
  const refs = binPaths.map((binPath) => flashedReferencePath(binPath));
  const haveAny = refs.some((ref) => ref !== undefined && referenceExists(ref));
  if (!haveAny) {
    return ["--skip-flashed"];
  }
  return [
    "--diff-with",
    ...refs.map((ref) =>
      ref !== undefined && referenceExists(ref) ? ref : "skip"
    ),
  ];
}

export async function existingFlashedReferences(
  buildDirPath: string,
  binPaths: string[]
): Promise<Set<string>> {
  const existing = new Set<string>();
  for (const binPath of binPaths) {
    const ref = flashedReferencePath(binPath);
    if (!ref) {
      continue;
    }
    const absolute = isAbsolute(ref) ? ref : join(buildDirPath, ref);
    if (await pathExists(absolute)) {
      existing.add(ref);
    }
  }
  return existing;
}

/** Copy flashed binaries to `*_flashed.bin` for the next `--diff-with`. */
export async function saveFlashedBinCopies(
  buildDirPath: string,
  binPaths: string[]
): Promise<void> {
  for (const binPath of binPaths) {
    const ref = flashedReferencePath(binPath);
    if (!ref) {
      continue;
    }
    const source = isAbsolute(binPath) ? binPath : join(buildDirPath, binPath);
    const dest = isAbsolute(ref) ? ref : join(buildDirPath, ref);
    try {
      if (
        !(await pathExists(source)) ||
        (await sameFileContents(source, dest))
      ) {
        continue;
      }
      await copy(source, dest, { overwrite: true });
    } catch (error) {
      const logged =
        error instanceof Error
          ? error
          : new Error("Could not save the flashed binary copy.");
      try {
        Logger.error(
          `Could not save ${ref}. The next flash will run without this comparison file.`,
          logged,
          "saveFlashedBinCopies"
        );
      } catch {
        // Logger.init may not have run yet, for example in unit tests.
      }
    }
  }
}

async function sameFileContents(
  source: string,
  dest: string
): Promise<boolean> {
  if (!(await pathExists(dest))) {
    return false;
  }
  const [left, right] = await Promise.all([readFile(source), readFile(dest)]);
  return left.equals(right);
}
