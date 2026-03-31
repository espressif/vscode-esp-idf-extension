/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Tuesday, 31st March 2026 2:34:52 pm
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
import { IdfTaskExecution, TaskManager } from "../taskManager";
import {
  OutputCapturingExecution,
  ShellOutputCapturingExecution,
} from "../taskManager/customExecution";
import { BuildTask } from "./buildTask";

export type MaybeIdfTaskExecution = IdfTaskExecution | undefined;

export function collectExecutions(
  ...executions: MaybeIdfTaskExecution[]
): IdfTaskExecution[] {
  return executions.filter(
    (execution): execution is IdfTaskExecution => execution !== undefined
  );
}

export function cleanupBuildState(buildTask: BuildTask) {
  TaskManager.disposeListeners();
  buildTask.building(false);
  BuildTask.isBuilding = false;
}

export async function throwCapturedTaskFailure(
  executions: MaybeIdfTaskExecution[]
) {
  for (const execution of executions) {
    if (!execution || !("getOutput" in execution)) {
      continue;
    }

    const executionOutput = await (execution as
      | OutputCapturingExecution
      | ShellOutputCapturingExecution).getOutput();
    if (executionOutput && !executionOutput.success) {
      if (executionOutput.stderr?.trim()) {
        throw executionOutput.stderr;
      }
      if (executionOutput.stdout?.trim()) {
        throw executionOutput.stdout;
      }
      throw new Error(`Task exited with code ${executionOutput.exitCode}`);
    }
  }
}
