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

import { spawn } from "child_process";
import { loadVscodeNodePty } from "./nodePty";

export interface SpawnCapturedProcessRequest {
  file: string;
  args: string[];
  cwd?: string;
  env?: { [key: string]: string | undefined };
  cols?: number;
  rows?: number;
  name?: string;
}

export interface SpawnCapturedProcessListeners {
  onData: (chunk: string, stream: "stdout" | "stderr") => void;
  onExit: (exitCode: number) => void;
  onError: (error: Error) => void;
}

export interface ICapturedProcess {
  write(data: string): void;
  resize(columns: number, rows: number): void;
  kill(): void;
}

export function applyTaskTerminalEnv(env?: {
  [key: string]: string | undefined;
}): { [key: string]: string } {
  const merged: { [key: string]: string } = {};
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  merged.FORCE_COLOR = "1";
  merged.TERM = "xterm-256color";
  merged.COLORTERM = "truecolor";
  return merged;
}

export function spawnCapturedProcess(
  request: SpawnCapturedProcessRequest,
  listeners: SpawnCapturedProcessListeners
): ICapturedProcess {
  const env = applyTaskTerminalEnv(request.env);
  const nodePty = loadVscodeNodePty();
  if (nodePty) {
    return spawnWithNodePty(nodePty, request, env, listeners);
  }
  return spawnWithChildProcess(request, env, listeners);
}

function spawnWithNodePty(
  nodePty: NonNullable<ReturnType<typeof loadVscodeNodePty>>,
  request: SpawnCapturedProcessRequest,
  env: { [key: string]: string },
  listeners: SpawnCapturedProcessListeners
): ICapturedProcess {
  try {
    const ptyProcess = nodePty.spawn(request.file, request.args, {
      name: request.name || "xterm-256color",
      cols: request.cols || 80,
      rows: request.rows || 24,
      cwd: request.cwd,
      env,
    });

    ptyProcess.onData((data) => {
      listeners.onData(data, "stdout");
    });
    ptyProcess.onExit((event) => {
      listeners.onExit(event.exitCode ?? 0);
    });

    return {
      write: (data) => ptyProcess.write(data),
      resize: (columns, rows) => ptyProcess.resize(columns, rows),
      kill: () => ptyProcess.kill(),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    listeners.onError(err);
    return noOpProcess();
  }
}

/** Pipes emit bare line feeds, which a terminal renders without a carriage return. */
export function toTerminalNewlines(chunk: string): string {
  return chunk.replace(/\r?\n/g, "\r\n");
}

function spawnWithChildProcess(
  request: SpawnCapturedProcessRequest,
  env: { [key: string]: string },
  listeners: SpawnCapturedProcessListeners
): ICapturedProcess {
  const child = spawn(request.file, request.args, {
    cwd: request.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stdout?.on("data", (data: Buffer) => {
    listeners.onData(toTerminalNewlines(data.toString()), "stdout");
  });
  child.stderr?.on("data", (data: Buffer) => {
    listeners.onData(toTerminalNewlines(data.toString()), "stderr");
  });
  child.on("close", (code) => {
    listeners.onExit(code ?? 0);
  });
  child.on("error", (error) => {
    listeners.onError(error);
  });

  return {
    write: (data) => {
      child.stdin?.write(data);
    },
    resize: () => {
      /* piped child processes have no PTY size */
    },
    kill: () => {
      child.kill();
    },
  };
}

function noOpProcess(): ICapturedProcess {
  return {
    write: () => undefined,
    resize: () => undefined,
    kill: () => undefined,
  };
}
