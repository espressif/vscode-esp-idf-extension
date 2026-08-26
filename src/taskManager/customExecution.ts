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

import { CustomExecution } from "vscode";
import { CapturedTaskOutput, TaskSuccessEpilogue } from "./types";
import { OutputCapturingPseudoterminal } from "./outputCapturePseudoTerminal";

export interface OutputCapturingExecutionOptions {
  cwd?: string;
  env?: { [key: string]: string | undefined };
  epilogue?: TaskSuccessEpilogue;
}

export class OutputCapturingExecution extends CustomExecution {
  private outputPromise: Promise<CapturedTaskOutput> | undefined;
  private resolveOutput: ((output: CapturedTaskOutput) => void) | undefined;
  private rejectOutput: ((error: Error) => void) | undefined;
  private pseudoterminal: OutputCapturingPseudoterminal | undefined;

  constructor(
    private command: string,
    private args: string[],
    private options: OutputCapturingExecutionOptions
  ) {
    super(async () => {
      this.outputPromise = new Promise<CapturedTaskOutput>(
        (resolve, reject) => {
          this.resolveOutput = resolve;
          this.rejectOutput = reject;
        }
      );

      this.pseudoterminal = new OutputCapturingPseudoterminal(
        {
          file: this.command,
          args: this.args,
          cwd: this.options.cwd,
          env: this.options.env,
        },
        (output) => this.resolveOutput?.(output),
        (error) => this.rejectOutput?.(error),
        this.options.epilogue
      );
      return this.pseudoterminal;
    });
  }

  public terminate(): void {
    this.pseudoterminal?.close();
  }

  public async getOutput(): Promise<CapturedTaskOutput> {
    if (!this.outputPromise) {
      return {
        stdout: "",
        stderr: "",
        exitCode: -1,
        success: false,
      };
    }
    return this.outputPromise;
  }

  public static create(
    command: string,
    args: string[],
    options: OutputCapturingExecutionOptions
  ): OutputCapturingExecution {
    return new OutputCapturingExecution(command, args, options);
  }
}
