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

import { CustomExecution, EventEmitter, ShellExecutionOptions } from "vscode";
import { ChildProcess, spawn } from "child_process";
import { basename } from "path";
import { OutputCapturingPseudoterminal } from "./outputCapturePseudoTerminal";
import { CapturedTaskOutput } from "./types";

export class ShellOutputCapturingExecution extends CustomExecution {
  private outputPromise: Promise<CapturedTaskOutput> | undefined;
  private resolveOutput: ((output: CapturedTaskOutput) => void) | undefined;
  private rejectOutput: ((error: Error) => void) | undefined;
  private writeEmitter: EventEmitter<string> | undefined;
  private childProcess: ChildProcess | undefined;

  constructor(
    private command: string,
    private options: ShellExecutionOptions
  ) {
    super(async (resolvedDefinition) => {
      this.outputPromise = new Promise<CapturedTaskOutput>(
        (resolve, reject) => {
          this.resolveOutput = resolve;
          this.rejectOutput = reject;
        }
      );

      const pseudoterminal = new OutputCapturingPseudoterminal(
        this.outputPromise!
      );
      this.writeEmitter = pseudoterminal.getWriteEmitter();

      pseudoterminal.setStartHandler(() => this.executeShellCommand());
      return pseudoterminal;
    });
  }

  private executeShellCommand(): void {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    if (this.options.env) {
      this.options.env.FORCE_COLOR = "1";
      this.options.env.TERM = "xterm-256color";
      this.options.env.COLORTERM = "truecolor";
    }

    // Prefer an absolute, known shell path when none is configured. In some VS Code
    // environments PATH can be minimal, making "sh" fail with ENOENT.
    const shellPath =
      this.options.executable ||
      process.env.SHELL ||
      (process.platform === "win32" ? "cmd.exe" : "/bin/sh");
    const shellBase = basename(shellPath).toLowerCase();
    const args = [...(this.options.shellArgs || [])];

    const ensureFlagWithCommand = (flag: string) => {
      const idx = args.findIndex((a) => a.toLowerCase() === flag.toLowerCase());
      if (idx === -1) {
        args.push(flag, this.command);
        return;
      }
      // Ensure the command is the argument immediately after the flag and discard extra args.
      if (idx + 1 < args.length) {
        args[idx + 1] = this.command;
        args.length = idx + 2;
      } else {
        args.push(this.command);
      }
    };

    // Ensure the spawned shell executes the command and then exits; otherwise the task can hang.
    if (shellBase === "cmd.exe" || shellBase === "cmd") {
      // cmd.exe requires /c <command> to run and exit
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
      // PowerShell should use -Command <command> to run and exit
      if (!args.some((a) => a.toLowerCase() === "-noprofile")) {
        args.push("-NoProfile");
      }
      ensureFlagWithCommand("-Command");
    } else {
      // POSIX shells (sh/bash/zsh/fish): -c <command>
      ensureFlagWithCommand("-c");
    }

    this.childProcess = spawn(shellPath, args, {
      cwd: this.options.cwd,
      env: this.options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Stream stdout in real-time
    this.childProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      const formattedOutput = output.replace(/\r/g, "").replace(/\n/g, "\r\n");
      stdout += formattedOutput;
      if (this.writeEmitter) {
        this.writeEmitter.fire(formattedOutput);
      }
    });

    // Stream stderr in real-time
    this.childProcess.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      const formattedOutput = output.replace(/\r/g, "").replace(/\n/g, "\r\n");
      stderr += formattedOutput;
      if (this.writeEmitter) {
        this.writeEmitter.fire(formattedOutput);
      }
    });

    this.childProcess.on("close", (code) => {
      exitCode = code || 0;
      const output: CapturedTaskOutput = {
        stdout,
        stderr,
        exitCode,
        success: exitCode === 0,
      };

      if (this.resolveOutput) {
        this.resolveOutput(output);
      }
    });

    this.childProcess.on("error", (error) => {
      if (this.rejectOutput) {
        this.rejectOutput(error);
      }
    });
  }

  public terminate(): void {
    if (this.childProcess) {
      this.childProcess.kill();
    }
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