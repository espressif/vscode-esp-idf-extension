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
import { Event, EventEmitter, Pseudoterminal } from "vscode";
import { CapturedTaskOutput } from "./types";

export class OutputCapturingPseudoterminal implements Pseudoterminal {
  private writeEmitter = new EventEmitter<string>();
  private closeEmitter = new EventEmitter<number>();
  private startHandler: (() => void) | undefined;
  private isOpened = false;
  private hasStarted = false;

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
        // VS Code expects a numeric exit code for task completion. Some Node errors
        // use string codes (e.g. "ENOENT"). Coerce to a number safely.
        const rawCode = (error as any).code;
        const exitCode =
          typeof rawCode === "number"
            ? rawCode
            : Number.isFinite(Number(rawCode))
            ? Number(rawCode)
            : 1;
        this.closeEmitter.fire(exitCode);
      });
  }

  onDidWrite: Event<string> = this.writeEmitter.event;
  onDidClose: Event<number> = this.closeEmitter.event;

  open(): void {
    // VS Code only hooks up the pseudoterminal events after we return the object.
    // Starting the process here avoids dropping early stdout/close events for fast commands.
    this.isOpened = true;
    this.start();
  }

  close(): void {
    // Terminal is closed - this is called when VS Code wants to terminate the task
    // We can't directly terminate the child process from here, but the execution class
    // should handle termination through its terminate() method
  }

  handleInput(data: string): void {
    // Handle any input if needed
  }

  getWriteEmitter(): EventEmitter<string> {
    return this.writeEmitter;
  }

  setStartHandler(handler: () => void) {
    this.startHandler = handler;
    if (this.isOpened) {
      this.start();
    }
  }

  private start() {
    if (this.hasStarted) {
      return;
    }
    if (!this.startHandler) {
      return;
    }
    this.hasStarted = true;
    this.startHandler();
  }
}