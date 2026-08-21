/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 9th June 2026 5:10:11 pm
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
import {
  Event,
  EventEmitter,
  Pseudoterminal,
  TerminalDimensions,
} from "vscode";
import { CapturedTaskOutput } from "./types";
import {
  ICapturedProcess,
  SpawnCapturedProcessRequest,
  spawnCapturedProcess,
} from "./capturedProcess";

const ANSI_ESCAPE = /[\u001B\u009B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Turns terminal bytes into plain text for {@link CapturedTaskOutput} consumers
 * (output channel, language tools, error metadata), which render neither ANSI
 * nor cursor movement. Progress lines rewritten with a lone `\r` (ninja) become
 * separate lines so the whole history stays readable.
 */
export function sanitizeCapturedText(raw: string): string {
  return raw
    .replace(ANSI_ESCAPE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export class OutputCapturingPseudoterminal implements Pseudoterminal {
  private writeEmitter = new EventEmitter<string>();
  private closeEmitter = new EventEmitter<number>();
  private capturedProcess: ICapturedProcess | undefined;
  private stdout = "";
  private stderr = "";
  private settled = false;

  constructor(
    private spawnRequest: Omit<SpawnCapturedProcessRequest, "cols" | "rows">,
    private resolveOutput: (output: CapturedTaskOutput) => void,
    private rejectOutput: (error: Error) => void
  ) {}

  onDidWrite: Event<string> = this.writeEmitter.event;
  onDidClose: Event<number> = this.closeEmitter.event;

  open(initialDimensions?: TerminalDimensions): void {
    this.capturedProcess = spawnCapturedProcess(
      {
        ...this.spawnRequest,
        cols: initialDimensions?.columns,
        rows: initialDimensions?.rows,
      },
      {
        onData: (chunk, stream) => {
          if (stream === "stderr") {
            this.stderr += chunk;
          } else {
            this.stdout += chunk;
          }
          this.writeEmitter.fire(chunk);
        },
        onExit: (exitCode) => this.finish(exitCode),
        onError: (error) => this.fail(error),
      }
    );
  }

  close(): void {
    this.capturedProcess?.kill();
  }

  handleInput(data: string): void {
    this.capturedProcess?.write(data);
  }

  setDimensions(dimensions: TerminalDimensions): void {
    this.capturedProcess?.resize(dimensions.columns, dimensions.rows);
  }

  private finish(exitCode: number): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.resolveOutput({
      stdout: sanitizeCapturedText(this.stdout),
      stderr: sanitizeCapturedText(this.stderr),
      exitCode,
      success: exitCode === 0,
    });
    this.closeEmitter.fire(exitCode);
  }

  private fail(error: Error): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.writeEmitter.fire(`Error: ${error.message}\r\n`);
    this.rejectOutput(error);
    const rawCode = (error as NodeJS.ErrnoException).code;
    const exitCode =
      typeof rawCode === "number"
        ? rawCode
        : Number.isFinite(Number(rawCode))
        ? Number(rawCode)
        : 1;
    this.closeEmitter.fire(exitCode);
  }
}
