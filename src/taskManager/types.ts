/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 9th June 2026 6:27:08 pm
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

export interface CapturedTaskOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface IdfTaskResult {
  taskId: string;
  taskName: string;
  output: CapturedTaskOutput;
  processCommand?: string;
  processArgs?: string[];
}

export interface CustomExecutionTaskResult {
  continueFlag: boolean;
}

/**
 * Text written to the task terminal once the process exits with code 0. It is
 * not part of {@link CapturedTaskOutput.stdout}, so it never reaches error
 * metadata, hints parsing or language model tool results.
 */
export type TaskSuccessEpilogue = () =>
  | Promise<string | undefined>
  | string
  | undefined;
