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

import { dirname } from "path";
import { capturedProcessText } from "../common/error/knownError";
import { Logger } from "../common/logger";
import { getVirtualEnvPythonPath } from "../configuration/env";
import { execChildProcess } from "../support/execChildProcess";

const PACKAGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * One-line probes. sanitizeSpawnInvocation rejects arguments that contain
 * raw newlines, so these cannot be multi-line scripts.
 * importlib.metadata is stdlib on Python 3.8+; importlib_metadata covers
 * older ESP-IDF 4.4 virtual environments.
 */
export const PYTHON_PACKAGE_VERSION_SNIPPETS = [
  "from importlib.metadata import version; import sys; print(version(sys.argv[1]))",
  "from importlib_metadata import version; import sys; print(version(sys.argv[1]))",
] as const;

const versionCache = new Map<string, string>();

export function clearPythonPackageVersionCache(): void {
  versionCache.clear();
}

export function normalizePythonPackageVersion(raw: string): string {
  const line = raw
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .pop();
  if (!line) {
    throw new Error("Python package version output was empty.");
  }
  const publicVersion = line.split("+", 1)[0].trim();
  if (!publicVersion) {
    throw new Error("Python package version output was empty.");
  }
  return publicVersion;
}

function cacheKey(pythonBinPath: string, packageName: string): string {
  return `${pythonBinPath}\0${packageName}`;
}

function isMetadataImportFailure(error: unknown): boolean {
  const text = capturedProcessText(error);
  return (
    text.includes("No module named 'importlib.metadata'") ||
    text.includes("No module named 'importlib_metadata'")
  );
}

function reportVersionLookupFailure(message: string, error: unknown): Error {
  const logged = error instanceof Error ? error : new Error(message);
  try {
    Logger.error(message, logged, "getPythonPackageVersion");
  } catch {
    // Logger.init may not have run yet, for example in unit tests.
  }
  return logged;
}

export async function getPythonPackageVersion(
  packageName: string,
  pythonBinPath?: string
): Promise<string> {
  if (!PACKAGE_NAME_PATTERN.test(packageName)) {
    throw reportVersionLookupFailure(
      `Invalid Python package name: ${packageName}`,
      new Error(`Invalid Python package name: ${packageName}`)
    );
  }

  const resolvedPython = pythonBinPath ?? getVirtualEnvPythonPath();
  if (!resolvedPython) {
    throw reportVersionLookupFailure(
      "Python virtual environment path is not configured.",
      new Error("Python virtual environment path is not configured.")
    );
  }

  const key = cacheKey(resolvedPython, packageName);
  const cached = versionCache.get(key);
  if (cached) {
    return cached;
  }

  const cwd = dirname(resolvedPython) || process.cwd();
  let lastError: unknown;
  for (let index = 0; index < PYTHON_PACKAGE_VERSION_SNIPPETS.length; index++) {
    const snippet = PYTHON_PACKAGE_VERSION_SNIPPETS[index];
    const isLastSnippet = index === PYTHON_PACKAGE_VERSION_SNIPPETS.length - 1;
    try {
      const output = await execChildProcess(
        resolvedPython,
        ["-c", snippet, packageName],
        cwd
      );
      const version = normalizePythonPackageVersion(output);
      versionCache.set(key, version);
      return version;
    } catch (error) {
      lastError = error;
      if (isLastSnippet || !isMetadataImportFailure(error)) {
        break;
      }
    }
  }

  throw reportVersionLookupFailure(
    `Could not read version for Python package ${packageName}.`,
    lastError ??
      new Error(`Could not read version for Python package ${packageName}.`)
  );
}
