/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 12th June 2026 4:11:10 pm
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

import { rm } from "fs/promises";
import { buildDirLocked, KnownError } from "../common/error/knownError";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 200;
const LOCKED_ERRNO_CODES = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);

export function toLockedPathError(
  error: unknown,
  path: string
): KnownError | undefined {
  const errno = error as NodeJS.ErrnoException | undefined;
  const code = errno?.code;
  if (typeof code === "string" && LOCKED_ERRNO_CODES.has(code)) {
    return buildDirLocked(errno?.path ?? path, code);
  }
  return undefined;
}

export async function removePath(path: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      const locked = toLockedPathError(error, path);
      if (!locked) {
        throw error;
      }
      if (attempt >= MAX_ATTEMPTS) {
        throw locked;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      );
    }
  }
}
