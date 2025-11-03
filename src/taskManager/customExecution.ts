/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 27th September 2019 9:59:57 pm
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
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

import * as vscode from "vscode";
import { ChildProcess, execFile, ExecFileOptions, spawn } from "child_process";

export interface CustomExecutionTaskResult {
  continueFlag: boolean;
  executions: (OutputCapturingExecution | ShellOutputCapturingExecution)[];
}

export interface CapturedTaskOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

class OutputCapturingPseudoterminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();

  constructor(private outputPromise: Promise<CapturedTaskOutput>) {
    this.outputPromise
      .then((output) => {
        // Don't write output again since it's already been streamed in real-time
        // Just close the terminal with the exit code
        this.closeEmitter.fire(output.exitCode);
      })
      .catch((error) => {
        // Write error to terminal only if it wasn't already streamed
        this.writeEmitter.fire(`Error: ${error.message}\n`);
        // Use the error's exit code if available, otherwise default to 1
        const exitCode = (error as any).code || 1;
        this.closeEmitter.fire(exitCode);
      });
  }

  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  onDidClose: vscode.Event<number> = this.closeEmitter.event;

  open(): void {
    // Terminal is opened, but we don't need to do anything special
  }

  close(): void {
    // Terminal is closed - this is called when VS Code wants to terminate the task
    // We can't directly terminate the child process from here, but the execution class
    // should handle termination through its terminate() method
  }

  handleInput(data: string): void {
    // Handle any input if needed
  }

  getWriteEmitter(): vscode.EventEmitter<string> {
    return this.writeEmitter;
  }
}

export class OutputCapturingExecution extends vscode.CustomExecution {
  private outputPromise: Promise<CapturedTaskOutput> | undefined;
  private resolveOutput: ((output: CapturedTaskOutput) => void) | undefined;
  private rejectOutput: ((error: Error) => void) | undefined;
  private writeEmitter: vscode.EventEmitter<string> | undefined;
  private childProcess: ChildProcess | undefined;

  constructor(
    private command: string,
    private args: string[],
    private options: ExecFileOptions
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

      this.executeCommand();
      return pseudoterminal;
    });
  }

  private executeCommand(): void {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    if (this.options.env) {
      this.options.env.FORCE_COLOR = "1";
      this.options.env.TERM = "xterm-256color";
      this.options.env.COLORTERM = "truecolor";
    }

    this.childProcess = execFile(
      this.command,
      this.args,
      this.options
    ) as ChildProcess;

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
      return {
        stdout: "",
        stderr: "",
        exitCode: -1,
        success: false,
      } as CapturedTaskOutput;
    }
    return this.outputPromise;
  }

  public static create(
    command: string,
    args: string[],
    options: ExecFileOptions
  ): OutputCapturingExecution {
    return new OutputCapturingExecution(command, args, options);
  }
}

export class ShellOutputCapturingExecution extends vscode.CustomExecution {
  private outputPromise: Promise<CapturedTaskOutput> | undefined;
  private resolveOutput: ((output: CapturedTaskOutput) => void) | undefined;
  private rejectOutput: ((error: Error) => void) | undefined;
  private writeEmitter: vscode.EventEmitter<string> | undefined;
  private childProcess: ChildProcess | undefined;

  constructor(
    private command: string,
    private options: vscode.ShellExecutionOptions
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

      this.executeShellCommand();
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

    const execOptions: any = {
      cwd: this.options.cwd,
      env: this.options.env,
    };

    if (this.options.executable) {
      execOptions.shell = this.options.executable;
    }

    if (this.options.shellArgs) {
      execOptions.shellArgs = this.options.shellArgs;
    }

    this.childProcess = spawn(
      this.options.executable || process.env.SHELL || "sh",
      this.options.shellArgs || [],
      {
        ...execOptions,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    // Send the command to the shell
    this.childProcess.stdin?.write(this.command + "\n");
    this.childProcess.stdin?.end();

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
    options: vscode.ShellExecutionOptions
  ): ShellOutputCapturingExecution {
    return new ShellOutputCapturingExecution(command, options);
  }
}
