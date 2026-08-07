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

import { CancellationToken, Disposable, Uri } from "vscode";
import { connectOpenOcdForJtag } from "../../../espIdf/openOcd/jtagPreflight";
import { TCLClient } from "../../../espIdf/openOcd/tcl/tclClient";
import { eraseFlashTelnetCommand } from "./tclClientCmd";
import { collectExecutions } from "../../../taskManager/taskManager";
import { CustomExecutionTaskResult } from "../../../taskManager/types";
import { eraseJtagOpenOcdPresentation } from "../../jtagOpenOcdPresentation";
import { throwEraseCapturedTaskFailure } from "../../eraseTaskFailure";

export async function jtagEraseFlashCommand(
  cancelToken: CancellationToken,
  workspaceFolder: Uri
): Promise<CustomExecutionTaskResult> {
  let client: TCLClient | undefined;
  let cancelSubscription: Disposable | undefined;
  try {
    client = await connectOpenOcdForJtag(
      workspaceFolder,
      eraseJtagOpenOcdPresentation
    );
    cancelSubscription = cancelToken.onCancellationRequested(() => {
      client?.stop();
    });
    const eraseResult = await eraseFlashTelnetCommand(
      client,
      "halt; flash erase_sector 0 0 last; reset"
    );
    if (!eraseResult.continueFlag) {
      await throwEraseCapturedTaskFailure(eraseResult.executions);
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
    cancelSubscription?.dispose();
    client?.stop();
  }
}
