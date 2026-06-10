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

import { CustomExecution, EventEmitter } from "vscode";
import {
  ChildProcess,
  execFile,
  ExecFileOptions,
} from "child_process";
import { CapturedTaskOutput } from "./types";
import { OutputCapturingPseudoterminal } from "./outputCapturePseudoTerminal";

export class OutputCapturingExecution extends CustomExecution {
  private outputPromise: Promise<CapturedTaskOutput> | undefined;
  private resolveOutput: ((output: CapturedTaskOutput) => void) | undefined;
  private rejectOutput: ((error: Error) => void) | undefined;
  private writeEmitter: EventEmitter<string> | undefined;
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

      pseudoterminal.setStartHandler(() => this.executeCommand());
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
      this.options,
      () => {
        // Output is captured through stream listeners below.
      }
    );

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
