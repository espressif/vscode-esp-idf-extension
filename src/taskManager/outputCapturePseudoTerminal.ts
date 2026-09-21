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
import { CapturedTaskOutput, TaskSuccessEpilogue } from "./types";
import {
  ICapturedProcess,
  SpawnCapturedProcessRequest,
  spawnCapturedProcess,
  toTerminalNewlines,
} from "./capturedProcess";
import { Logger } from "../common/logger";

const ANSI_CSI = /(?:\u001B\[|\u009B)[0-?]*[ -/]*[@-~]/g;
const ANSI_ERASE_CHARACTERS = /(?:\u001B\[|\u009B)(\d*)X/g;
const ANSI_OSC = /\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g;
const NONPRINTING_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001A\u001C-\u001F\u007F-\u009F]/g;

/**
 * Turns terminal bytes into plain text for {@link CapturedTaskOutput} consumers
 * (output channel, language tools, error metadata), which render neither ANSI
 * nor cursor movement. Progress lines rewritten with a lone `\r` (ninja) become
 * separate lines so the whole history stays readable.
 */
export function sanitizeCapturedText(raw: string): string {
  const MAX_ERASE_CHARACTERS = 1000;
  return raw
    .replace(ANSI_OSC, "")
    .replace(ANSI_ERASE_CHARACTERS, (_sequence, count: string) =>
      " ".repeat(
        Math.min(count === "" ? 1 : Number(count), MAX_ERASE_CHARACTERS)
      )
    )
    .replace(ANSI_CSI, "")
    .replace(NONPRINTING_CONTROL, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export function resolveInitialColumns(
  initialDimensions?: TerminalDimensions,
  configuredColumns?: number
): number | undefined {
  return initialDimensions?.columns ?? configuredColumns;
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
    private epilogue?: TaskSuccessEpilogue,
    private initialColumns?: number
  ) {}

  onDidWrite: Event<string> = this.writeEmitter.event;
  onDidClose: Event<number> = this.closeEmitter.event;

  open(initialDimensions?: TerminalDimensions): void {
    this.capturedProcess = spawnCapturedProcess(
      {
        ...this.spawnRequest,
        cols: resolveInitialColumns(initialDimensions, this.initialColumns),
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
        onExit: (exitCode) => void this.finish(exitCode),
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

  private async finish(exitCode: number): Promise<void> {
    if (this.settled) {
      return;
    }
    this.settled = true;
    if (exitCode === 0) {
      await this.writeEpilogue();
    }
    this.resolveOutput({
      stdout: sanitizeCapturedText(this.stdout),
      stderr: sanitizeCapturedText(this.stderr),
      exitCode,
      success: exitCode === 0,
    });
    this.closeEmitter.fire(exitCode);
  }

  private async writeEpilogue(): Promise<void> {
    if (!this.epilogue) {
      return;
    }
    try {
      const text = await this.epilogue();
      if (text) {
        this.writeEmitter.fire(toTerminalNewlines(`\n${text}\n`));
      }
    } catch (error) {
      Logger.error(
        "Failed to write the task terminal epilogue",
        error instanceof Error ? error : new Error(String(error)),
        "OutputCapturingPseudoterminal writeEpilogue",
        undefined,
        false
      );
    }
  }

  private fail(error: Error): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    const errorLine = `File: ${
      this.spawnRequest.file
    }\nArgs: ${this.spawnRequest.args.join(" ")}\nCwd: ${
      this.spawnRequest.cwd ?? ""
    }\nError: ${error.message}`;
    this.writeEmitter.fire(toTerminalNewlines(`${errorLine}\n`));
    this.stderr += `${errorLine}\n`;
    const rawCode = (error as NodeJS.ErrnoException).code;
    const exitCode =
      typeof rawCode === "number"
        ? rawCode
        : Number.isFinite(Number(rawCode))
        ? Number(rawCode)
        : 1;
    const output: CapturedTaskOutput = {
      stdout: sanitizeCapturedText(this.stdout),
      stderr: sanitizeCapturedText(this.stderr),
      exitCode,
      success: false,
    };
    if (typeof rawCode === "string" && rawCode.length > 0) {
      output.spawnErrorCode = rawCode;
    }
    this.resolveOutput(output);
    this.closeEmitter.fire(exitCode);
  }
}
