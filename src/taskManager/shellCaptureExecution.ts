/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 9th June 2026 5:07:04 pm
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

import { CustomExecution, ShellExecutionOptions } from "vscode";
import { basename } from "path";
import { OutputCapturingPseudoterminal } from "./outputCapturePseudoTerminal";
import { CapturedTaskOutput } from "./types";

export class ShellOutputCapturingExecution extends CustomExecution {
  private outputPromise: Promise<CapturedTaskOutput> | undefined;
  private resolveOutput: ((output: CapturedTaskOutput) => void) | undefined;
  private rejectOutput: ((error: Error) => void) | undefined;
  private pseudoterminal: OutputCapturingPseudoterminal | undefined;

  constructor(
    public readonly command: string,
    private options: ShellExecutionOptions
  ) {
    super(async () => {
      this.outputPromise = new Promise<CapturedTaskOutput>(
        (resolve, reject) => {
          this.resolveOutput = resolve;
          this.rejectOutput = reject;
        }
      );

      const { file, args } = resolveShellInvocation(this.command, this.options);
      this.pseudoterminal = new OutputCapturingPseudoterminal(
        {
          file,
          args,
          cwd: this.options.cwd,
          env: this.options.env,
        },
        (output) => this.resolveOutput?.(output),
        (error) => this.rejectOutput?.(error)
      );
      return this.pseudoterminal;
    });
  }

  public terminate(): void {
    this.pseudoterminal?.close();
  }

  public async getOutput(): Promise<CapturedTaskOutput> {
    if (!this.outputPromise) {
      throw new Error("Task has not been executed yet");
    }
    return this.outputPromise;
  }

  public static create(
    command: string,
    options: ShellExecutionOptions
  ): ShellOutputCapturingExecution {
    return new ShellOutputCapturingExecution(command, options);
  }
}

function resolveShellInvocation(
  command: string,
  options: ShellExecutionOptions
): { file: string; args: string[] } {
  const shellPath =
    options.executable ||
    process.env.SHELL ||
    (process.platform === "win32" ? "cmd.exe" : "/bin/sh");
  const shellBase = basename(shellPath).toLowerCase();
  const args = [...(options.shellArgs || [])];

  const ensureFlagWithCommand = (flag: string) => {
    const idx = args.findIndex((a) => a.toLowerCase() === flag.toLowerCase());
    if (idx === -1) {
      args.push(flag, command);
      return;
    }
    if (idx + 1 < args.length) {
      args[idx + 1] = command;
      args.length = idx + 2;
    } else {
      args.push(command);
    }
  };

  if (shellBase === "cmd.exe" || shellBase === "cmd") {
    if (!args.some((a) => a.toLowerCase() === "/c")) {
      args.unshift("/d", "/c");
    }
    ensureFlagWithCommand("/c");
  } else if (
    shellBase === "powershell.exe" ||
    shellBase === "powershell" ||
    shellBase === "pwsh.exe" ||
    shellBase === "pwsh"
  ) {
    if (!args.some((a) => a.toLowerCase() === "-noprofile")) {
      args.push("-NoProfile");
    }
    ensureFlagWithCommand("-Command");
  } else {
    ensureFlagWithCommand("-c");
  }

  return { file: shellPath, args };
}
