/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 2:48:37 pm
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

import { ExtensionContext, workspace } from "vscode";
import { srcOp, UpdateCmakeLists } from "./srcsWatcher";

export async function addCmakeFileSystemWatcher(context: ExtensionContext) {
  // Add delete or update new sources in CMakeLists.txt of same folder
    const newSrcWatcher = workspace.createFileSystemWatcher(
      "**/*.{c,cpp,cc,S}",
      false,
      false,
      false
    );
    const srcWatchDeleteDisposable = newSrcWatcher.onDidDelete(async (e) => {
      if (UpdateCmakeLists.singletonPromise) {
        UpdateCmakeLists.singletonPromise.then(() => {
          UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.delete);
          UpdateCmakeLists.singletonPromise = undefined;
        });
      } else {
        UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.delete);
      }
    });
    context.subscriptions.push(srcWatchDeleteDisposable);
    const srcWatchCreateDisposable = newSrcWatcher.onDidCreate(async (e) => {
      if (UpdateCmakeLists.singletonPromise) {
        UpdateCmakeLists.singletonPromise.then(() => {
          UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
          UpdateCmakeLists.singletonPromise = undefined;
        });
      } else {
        UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
      }
    });
    context.subscriptions.push(srcWatchCreateDisposable);
    const srcWatchOnChangeDisposable = newSrcWatcher.onDidChange(async (e) => {
      if (UpdateCmakeLists.singletonPromise) {
        UpdateCmakeLists.singletonPromise.then(() => {
          UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
          UpdateCmakeLists.singletonPromise = undefined;
        });
      } else {
        UpdateCmakeLists.updateSrcsInCmakeLists(e.fsPath, srcOp.other);
      }
    });
    context.subscriptions.push(srcWatchOnChangeDisposable);
    context.subscriptions.push(newSrcWatcher);
}
