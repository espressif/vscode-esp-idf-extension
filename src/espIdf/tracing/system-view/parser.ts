/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Thursday, 28th May 2020 11:35:16 pm
 * Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { AppTraceArchiveItems } from "../tree/appTraceArchiveTreeDataProvider";
import { window, ProgressLocation, Uri } from "vscode";
import { handleError } from "../../../common/error/handler";
import { isKnownError, parseError } from "../../../common/error/knownError";
import { SystemViewPanel } from "./panel";
import { SysviewTraceProc } from "../tools/sysviewTraceProc";
import { NotificationMode, readParameter } from "../../../configuration/idf";
import { traceArchiveCommandErrorMapping } from "../errorMapping";

export class SystemViewResultParser {
  public static parseWithProgress(
    trace: AppTraceArchiveItems,
    extensionPath: string,
    workspaceUri: Uri
  ) {
    const notificationMode = readParameter(
      "idf.notificationMode"
    ) as string;
    const progressLocation =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications
        ? ProgressLocation.Notification
        : ProgressLocation.Window;
    window.withProgress(
      {
        location: progressLocation,
        cancellable: false,
        title:
          "ESP-IDF: Processing your tracing file to generate System View Report",
      },
      async () => {
        try {
          const json = await this.parseSVDATToJSON(trace.filePath, workspaceUri);
          SystemViewPanel.show(extensionPath, json);
        } catch (error) {
          if (isKnownError(error)) {
            await handleError(
              "espIdf.apptrace.archive.showReport",
              error,
              undefined,
              traceArchiveCommandErrorMapping
            );
            return;
          }
          await handleError(
            "espIdf.apptrace.archive.showReport",
            parseError(trace.filePath),
            undefined,
            traceArchiveCommandErrorMapping
          );
        }
      }
    );
  }

  private static async parseSVDATToJSON(filePath: string, workspaceUri: Uri): Promise<any> {
    const sysView = new SysviewTraceProc(workspaceUri, filePath);
    const resp = await sysView.parse();
    try {
      return JSON.parse(resp.toString());
    } catch (_error) {
      throw parseError(filePath);
    }
  }
}
