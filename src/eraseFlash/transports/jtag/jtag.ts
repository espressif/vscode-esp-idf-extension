/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 5th December 2025 1:14:59 pm
 * Copyright 2025 Espressif Systems (Shanghai) CO LTD
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

import { Uri } from "vscode";
import {
  assertMinimumOpenOcdVersionForJtag,
  connectOpenOcdForJtag,
} from "../../../espIdf/openOcd/jtagPreflight";
import { TCLClient } from "../../../espIdf/openOcd/tcl/tclClient";
import { eraseFlashTelnetCommand } from "./tclClientCmd";
import {
  collectExecutions,
  throwCapturedTaskFailure,
} from "../../../taskManager/taskManager";
import { CustomExecutionTaskResult } from "../../../taskManager/types";

export async function jtagEraseFlashCommand(
  workspaceFolder: Uri
): Promise<CustomExecutionTaskResult> {
  await assertMinimumOpenOcdVersionForJtag();
  let client: TCLClient | undefined;
  try {
    client = await connectOpenOcdForJtag(workspaceFolder);
    const eraseResult = await eraseFlashTelnetCommand(
      client,
      "halt; flash erase_sector 0 0 last; reset"
    );
    if (!eraseResult.continueFlag) {
      await throwCapturedTaskFailure(eraseResult.executions);
      return {
        continueFlag: false,
        executions: collectExecutions(...eraseResult.executions),
      };
    }
    return {
      continueFlag: true,
      executions: collectExecutions(...eraseResult.executions),
    };
  } finally {
    client?.stop();
  }
}
