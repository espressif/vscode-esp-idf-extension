/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 18th September 2020 11:39:20 am
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

import { join } from "path";
import { commands, ExtensionContext, Uri, window } from "vscode";
import { ESP } from "./config";
import { Logger } from "./logger/logger";
import { packageJson } from "./utils";
import { NotificationMode, readParameter } from "./idfConfiguration";

export namespace ChangelogViewer {
  export async function showChangeLogAndUpdateVersion(cxt: ExtensionContext) {
    //get the version saved in the db
    const storedVersion = cxt.globalState.get<String>(
      ESP.ChangelogViewer.DB_VERSION_KEY
    );
    //get current_version from package.json
    const currentVersion = packageJson.version;
    const notificationMode = readParameter("idf.notificationMode") as string;
    const enableNotification =
      notificationMode === NotificationMode.All ||
      notificationMode === NotificationMode.Notifications;
    //check
    if (currentVersion !== storedVersion && enableNotification) {
      //new version update
      const msg = `It seems like the ESP-IDF Extension just got updated to version ${currentVersion}, checkout the changelog to see what new features got added`;
      const resp = await window.showInformationMessage(
        msg,
        "View Changelog",
        "Cancel"
      );
      if (resp === "View Changelog") {
        //show changelog file
        const changelogFilePath = join(
          cxt.extensionPath,
          ESP.ChangelogViewer.FileName
        );
        try {
          await commands.executeCommand(
            "markdown.showPreview",
            Uri.file(changelogFilePath)
          );
        } catch (error) {
          Logger.errorNotify("Failed to open the CHANGELOG.md file", error, {
            sev: 1,
          });
        }
      }
    }
    //write current_version back to db
    cxt.globalState.update(ESP.ChangelogViewer.DB_VERSION_KEY, currentVersion);
  }
}
