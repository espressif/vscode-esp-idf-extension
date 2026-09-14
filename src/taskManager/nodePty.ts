/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st August 2026
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

import { env } from "vscode";
import { join } from "path";
import { Logger } from "../common/logger";

declare const __webpack_require__: unknown;
declare const __non_webpack_require__: NodeRequire;

export interface IPtyProcess {
  readonly pid: number;
  onData(listener: (data: string) => void): void;
  onExit(
    listener: (event: { exitCode: number; signal?: number }) => void
  ): void;
  write(data: string): void;
  resize(columns: number, rows: number): void;
  kill(signal?: string): void;
}

export interface IPtySpawnOptions {
  name?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: { [key: string]: string | undefined };
}

export interface INodePty {
  spawn(
    file: string,
    args: string[] | string,
    options: IPtySpawnOptions
  ): IPtyProcess;
}

let cachedNodePty: INodePty | undefined;
let loadAttempted = false;

/**
 * Resolves the node-pty shipped with VS Code instead of bundling a native module,
 * which keeps the binary matched to the host Electron ABI.
 *
 * Returns undefined when unavailable (web extension host, changed VS Code layout)
 * so callers can fall back to piped child processes.
 */
export function loadVscodeNodePty(): INodePty | undefined {
  if (loadAttempted) {
    return cachedNodePty;
  }
  loadAttempted = true;

  const requireFunc =
    typeof __webpack_require__ === "function"
      ? __non_webpack_require__
      : require;

  const candidates = [
    join(env.appRoot, "node_modules", "node-pty"),
    join(env.appRoot, "node_modules.asar", "node-pty"),
  ];

  for (const candidate of candidates) {
    try {
      const loaded = requireFunc(candidate) as INodePty;
      if (loaded && typeof loaded.spawn === "function") {
        cachedNodePty = loaded;
        return cachedNodePty;
      }
    } catch (error) {
      continue;
    }
  }

  Logger.info(
    `node-pty not available from ${env.appRoot}, falling back to piped child processes`
  );
  return undefined;
}
