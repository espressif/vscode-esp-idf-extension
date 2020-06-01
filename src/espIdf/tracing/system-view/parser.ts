/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th May 2020 11:35:16 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AppTraceArchiveItems } from "../tree/appTraceArchiveTreeDataProvider";
import { window, ProgressLocation } from "vscode";
import { Logger } from "../../../logger/logger";
import { SystemViewPanel } from "./panel";
import { readJsonSync } from "fs-extra";

export class SystemViewResultParser {
  public static parseWithProgress(
    trace: AppTraceArchiveItems,
    extensionPath: string
  ) {
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: false,
        title: "Processing your tracing file to generate System View Report",
      },
      async () => {
        try {
          const json = await this.parseSVDATToJSON(trace.filePath);
          SystemViewPanel.show(extensionPath, json);
        } catch (error) {
          Logger.errorNotify(
            "Failed to parse tracing file while generating system view report",
            error
          );
        }
      }
    );
  }
  private static async parseSVDATToJSON(filePath: string): Promise<any> {
    //TODO - Add actual impl
    return readJsonSync(`/Users/soumesh/Downloads/trace_mcore.json`);
  }
}
